import uuid

from app.evaluation.runner import run_evaluation
from app.evaluation.schema import EvaluationDataset, EvaluationQuestion


def register_and_login(client, email, password="strongpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    login = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _upload_and_wait(client, headers, kb_id, filename, content: bytes):
    upload = client.post(
        f"/knowledge-bases/{kb_id}/documents",
        files={"file": (filename, content, "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 202
    return upload.json()


def test_run_evaluation_on_relevant_question(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat, db_session
):
    headers = register_and_login(client, "eval1@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "conges.txt", b"chat chat chat politique de conges.")

    dataset = EvaluationDataset(
        name="test_dataset",
        version="v0",
        questions=[
            EvaluationQuestion(id="q1", question="chat", expected_document_filenames=["conges.txt"]),
        ],
    )

    summary = run_evaluation(
        db_session,
        knowledge_base_id=uuid.UUID(kb["id"]),
        dataset=dataset,
        top_k=5,
        mode="vector",
        rerank=False,
        run_generation=True,
    )

    assert summary.total_questions == 1
    assert summary.errors == 0
    assert summary.mean_recall_at_k == 1.0
    assert summary.mrr == 1.0
    assert summary.results[0].answer != ""
    assert summary.results[0].grounded is True


def test_run_evaluation_without_ground_truth_returns_none_retrieval_metrics(
    client, fake_minio, worker_session_override, fake_embeddings, fake_chat, db_session
):
    headers = register_and_login(client, "eval2@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "doc.txt", b"chat chat chat")

    dataset = EvaluationDataset(
        name="test_dataset",
        version="v0",
        questions=[EvaluationQuestion(id="q1", question="chat", expected_document_filenames=[])],
    )

    summary = run_evaluation(db_session, uuid.UUID(kb["id"]), dataset, run_generation=False)

    assert summary.mean_recall_at_k is None  # pas de vérité terrain -> None, jamais 0
    assert summary.mean_precision_at_k is None


def test_run_evaluation_without_generation_skips_llm_judge(
    client, fake_minio, worker_session_override, fake_embeddings, db_session
):
    """Sans fake_chat : si run_generation=False appelait quand même le LLM, ce
    test planterait (aucun chat provider factice n'est configuré)."""
    headers = register_and_login(client, "eval3@example.com")
    kb = client.post("/knowledge-bases", json={"name": "RH"}, headers=headers).json()
    _upload_and_wait(client, headers, kb["id"], "doc.txt", b"chat chat chat")

    dataset = EvaluationDataset(
        name="test_dataset",
        version="v0",
        questions=[EvaluationQuestion(id="q1", question="chat", expected_document_filenames=["doc.txt"])],
    )

    summary = run_evaluation(db_session, uuid.UUID(kb["id"]), dataset, run_generation=False)

    assert summary.results[0].answer == ""
    assert summary.results[0].faithfulness is None
    assert summary.mean_recall_at_k == 1.0  # le retrieval, lui, tourne toujours


def test_run_evaluation_on_empty_kb_marks_question_as_not_grounded(
    client, fake_embeddings, fake_chat, db_session
):
    headers = register_and_login(client, "eval4@example.com")
    kb = client.post("/knowledge-bases", json={"name": "Vide"}, headers=headers).json()

    dataset = EvaluationDataset(
        name="test_dataset",
        version="v0",
        questions=[EvaluationQuestion(id="q1", question="chat", expected_document_filenames=["rien.txt"])],
    )

    summary = run_evaluation(db_session, uuid.UUID(kb["id"]), dataset, run_generation=True)

    assert summary.results[0].grounded is False
    assert summary.mean_recall_at_k == 0.0  # vérité terrain existe mais rien trouvé
