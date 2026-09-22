import os

# IMPORTANT : doit être fait AVANT tout import de app.* — le rate limiter est
# construit une fois à l'import de app.core.rate_limit avec l'URI de stockage
# lue à ce moment-là. On bascule sur un stockage mémoire pur pour les tests :
# jamais besoin d'un vrai Redis, et jamais de pollution entre exécutions de
# la suite de tests.
os.environ["RATE_LIMIT_STORAGE_URI"] = "memory://"

import pytest
import re
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import hash_password
from app.core.rate_limit import limiter
from app.worker import celery_app

# Mode "eager" : les tâches Celery s'exécutent en synchrone, dans le même
# processus, sans passer par un broker Redis réel. C'est le pattern standard
# recommandé par Celery pour les tests — .delay() se comporte comme un appel
# de fonction normal, ce qui permet de garder des tests synchrones (TestClient
# attend la fin du traitement avant de retourner la réponse) sans dépendre
# d'un worker Celery ni d'un Redis en cours d'exécution dans le sandbox de test.
celery_app.conf.update(
    task_always_eager=True,
    task_eager_propagates=True,
    broker_url="memory://",
    result_backend="cache+memory://",
)

# SQLite en mémoire, partagé entre les connexions du test (StaticPool) pour que
# les tables créées soient visibles par toutes les requêtes de la session de test.
TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Le stockage mémoire du rate limiter persiste entre les tests par défaut
    (c'est un état global du process). Sans ce reset, un test qui appelle
    /auth/login ou /auth/register plusieurs fois pourrait déclencher un 429
    inattendu à cause de tests précédents qui ont consommé le même quota."""
    try:
        limiter._storage.reset()
    except Exception:
        pass
    yield


@pytest.fixture(autouse=True)
def _clear_bm25_cache():
    """Le cache BM25 est un état global du process (dict module-level).
    Il stocke uniquement des IDs de chunks depuis le correctif, mais l'index
    BM25Okapi lui-même reste valide seulement pour la DB du test courant.
    On le vide avant chaque test pour éviter toute contamination entre suites."""
    from app.services.bm25_search import clear_bm25_cache
    clear_bm25_cache()
    yield
    clear_bm25_cache()


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def admin_user(db_session):
    """Crée directement un utilisateur ADMIN en base (pas de route publique pour ça, volontairement)."""
    user = User(
        email="admin@example.com",
        hashed_password=hash_password("adminpass123"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(client: TestClient, email: str, password: str) -> dict:
    response = client.post("/auth/login", json={"email": email, "password": password})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def worker_session_override(monkeypatch):
    """Le pipeline d'ingestion ouvre sa propre session DB (voir get_worker_session).
    En test, on la fait pointer vers la même base SQLite en mémoire que le reste."""
    monkeypatch.setattr("app.services.ingestion.get_worker_session", lambda: TestingSessionLocal())


# --- MinIO factice ---
class _FakeMinioResponse:
    def __init__(self, data: bytes):
        self._data = data

    def read(self):
        return self._data

    def close(self):
        pass

    def release_conn(self):
        pass


class FakeMinioClient:
    """Remplace le client MinIO réel dans les tests : stockage en mémoire.
    Permet de tester tout le pipeline upload -> ingestion sans serveur MinIO."""

    def __init__(self):
        self.store: dict[tuple[str, str], bytes] = {}

    def bucket_exists(self, bucket):
        return True

    def make_bucket(self, bucket):
        pass

    def put_object(self, bucket, object_name, stream, length=None, content_type=None):
        self.store[(bucket, object_name)] = stream.read()

    def get_object(self, bucket, object_name):
        return _FakeMinioResponse(self.store[(bucket, object_name)])

    def remove_object(self, bucket, object_name):
        self.store.pop((bucket, object_name), None)


@pytest.fixture
def fake_minio(monkeypatch):
    """Remplace get_minio_client() partout où il est appelé (route d'upload ET
    pipeline d'ingestion) par le même client en mémoire, pour que ce qui est
    uploadé soit bien ce que l'ingestion télécharge ensuite.

    Centralisé ici (conftest.py) et pas dans un fichier de test spécifique :
    une fixture pytest définie dans un module de test n'est visible QUE dans ce
    module — pas dans les autres fichiers de test. C'est ce qui causait les
    erreurs 'fixture fake_minio not found' dans test_chat.py, test_retrieval_
    search.py et test_hybrid_and_rerank.py, qui référençaient une fixture
    définie seulement dans test_ingestion_upload.py."""
    fake_client = FakeMinioClient()
    monkeypatch.setattr("app.api.routes.knowledge_bases.get_minio_client", lambda: fake_client)
    monkeypatch.setattr("app.services.ingestion.get_minio_client", lambda: fake_client)
    return fake_client


# --- Embeddings factices pour les tests ---
# Représentation "bag-of-words" sur un petit vocabulaire fixe : suffisant pour
# obtenir un classement déterministe et vérifiable dans les tests de recherche,
# sans dépendre d'un vrai modèle ni d'un accès réseau.
EMBEDDING_TEST_VOCAB = ["chat", "chien", "python", "facture", "contrat", "salaire"]


class FakeEmbeddingProvider:
    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        for text in texts:
            lowered = text.lower()
            vectors.append([float(lowered.count(word)) for word in EMBEDDING_TEST_VOCAB])
        return vectors


@pytest.fixture
def fake_embeddings(monkeypatch):
    """Remplace get_embedding_provider() partout où il est appelé (ingestion,
    recherche, chat, évaluation) par le même provider factice déterministe."""
    provider = FakeEmbeddingProvider()
    monkeypatch.setattr("app.services.ingestion.get_embedding_provider", lambda: provider)
    monkeypatch.setattr("app.api.routes.retrieval.get_embedding_provider", lambda: provider)
    monkeypatch.setattr("app.api.routes.chat.get_embedding_provider", lambda: provider)
    monkeypatch.setattr("app.evaluation.runner.get_embedding_provider", lambda: provider)
    return provider


# --- Chat provider factice ---
class FakeChatProvider:
    """Provider de génération déterministe pour les tests :
    - si le message system parle de réécriture de requête, renvoie la dernière
      question de l'utilisateur telle quelle (pas de vraie réécriture en test) ;
    - si le message system parle de reranking, renvoie l'ordre des candidats
      INVERSÉ (n, n-1, ..., 1) — comportement arbitraire mais déterministe,
      qui permet de vérifier dans les tests que le reranking change bien
      l'ordre des résultats par rapport à avant reranking ;
    - sinon, renvoie une réponse citant systématiquement la source [1], pour
      pouvoir vérifier que le pipeline de citations fonctionne de bout en bout.
    """

    def generate(self, messages: list[dict]) -> str:
        system = messages[0]["content"] if messages else ""
        lowered = system.lower()

        if "réécris" in lowered:
            last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            return last_user

        if "reranking" in lowered:
            user_content = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            numbers = re.findall(r"^(\d+)\.", user_content, flags=re.MULTILINE)
            n = len(numbers)
            return ",".join(str(i) for i in range(n, 0, -1))

        if "reformulations" in lowered:
            # Query expansion : deux reformulations factices déterministes.
            # Le contenu exact n'a pas d'importance pour les tests (aucun
            # vrai LLM derrière) — seul compte que expand_query() les intègre
            # bien à la fusion multi-requêtes.
            return "reformulation factice une\nreformulation factice deux"

        return "Voici la réponse basée sur le contexte fourni [1]."

    def generate_stream(self, messages: list[dict]):
        """Version "streamée" : redécoupe la réponse de generate() en quelques
        fragments, pour tester que le client SSE recolle bien les morceaux."""
        full_text = self.generate(messages)
        chunk_size = max(1, len(full_text) // 4)
        for i in range(0, len(full_text), chunk_size):
            yield full_text[i : i + chunk_size]


@pytest.fixture
def fake_chat(monkeypatch):
    provider = FakeChatProvider()
    monkeypatch.setattr("app.api.routes.chat.get_chat_provider", lambda: provider)
    monkeypatch.setattr("app.api.routes.retrieval.get_chat_provider", lambda: provider)
    monkeypatch.setattr("app.evaluation.runner.get_chat_provider", lambda: provider)
    return provider
