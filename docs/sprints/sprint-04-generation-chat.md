# Sprint 4 — RAG Generation & Chat

## Quoi

Génération de réponses groundées avec citations, gestion de l'historique de conversation,
réécriture de requête, et un refus déterministe quand l'information n'est pas dans les
documents.

## Pourquoi

**Modèles gratuits via OpenRouter** : pour rester sur un plan gratuit (contrainte
explicite du projet), génération et embeddings passent par OpenRouter plutôt que par un
fournisseur payant. Modèles retenus, avec identifiants vérifiés (pas inventés) :
- Génération : `z-ai/glm-5.2:free` (GLM 5.2 — bon suivi d'instructions de grounding, 128K
  de contexte).
- Embeddings : `liquid/lfm-2.5-embedding-350m:free` (limite stricte de 512 tokens par
  input — c'est pourquoi chaque chunk envoyé à l'API est tronqué à 1800 caractères par
  sécurité dans `embeddings.py`, ≈4 caractères/token en moyenne).

À savoir : ce sont des modèles **gratuits, rate-limités**, dont les entrées/sorties
peuvent être utilisées pour l'entraînement côté fournisseur — pas de données confidentielles
réelles là-dessus sans vérifier les conditions actuelles du fournisseur.

**Le refus "information absente" est codé en dur, pas laissé au LLM seul** : c'est la
décision la plus importante de ce sprint. Un LLM, même avec une excellente instruction
système, peut halluciner — l'instruction "dis que tu ne sais pas si le contexte ne suffit
pas" n'est qu'une consigne, pas une garantie. Le code vérifie donc *avant* même d'appeler le
LLM si la recherche a retourné des chunks pertinents ; si non, une réponse de refus fixe est
renvoyée, sans jamais interroger le modèle. Ce garde-fou ne peut pas être contourné par un
modèle capricieux.

**Réécriture de requête, mais seulement si un historique existe** : une question comme
"et les jours fériés ?" n'a de sens qu'avec le contexte de la conversation précédente. Avant
la recherche, un appel LLM transforme cette question en requête autonome ("Quelle est la
politique de jours fériés de l'entreprise ?"). Sur le premier message d'une conversation
(pas d'historique), la question est déjà autonome — l'appel est simplement sauté, pour ne
pas gaspiller une requête sur un plan gratuit rate-limité.

**Citations = toutes les sources récupérées, pas un parsing du texte généré** :
limite connue et documentée. Le système ne vérifie pas que le LLM a effectivement utilisé
`[1]` dans sa réponse — il retourne toutes les sources que la recherche a jugées
pertinentes. Plus simple, suffisant pour le MVP ; une correspondance stricte serait à ajouter
si les citations affichées au frontend doivent correspondre exactement aux `[n]` visibles
dans le texte.

## Comment

**Pipeline de `POST /chat`** :
```
1. Vérifie l'ownership de la knowledge base
2. Charge l'historique (ou crée une nouvelle conversation)
3. Réécriture de requête (si historique existe)
4. Recherche sémantique sur la requête réécrite
5. Si aucun résultat pertinent → refus déterministe (pas d'appel LLM)
   Sinon → prompt groundé avec citations numérotées → génération → réponse
6. Message utilisateur + message assistant (avec citations JSON) persistés
```

**Fichiers clés** :
- `app/services/generation.py` — provider de chat interchangeable, même pattern que les
  embeddings (`ChatProvider` / `get_chat_provider()`).
- `app/services/prompt_builder.py` — prompt système imposant le grounding strict et les
  citations `[n]`.
- `app/services/query_rewriting.py` — réécriture conditionnelle (voir "Pourquoi").
- `app/api/routes/chat.py` — orchestration complète.

**Modèles ajoutés** : `Conversation` (knowledge_base_id, user_id, title),
`Message` (conversation_id, role USER/ASSISTANT, content, citations JSON).

**Endpoints** : `POST /chat`, `GET /conversations/{id}`, et
`GET /knowledge-bases/{id}/conversations` (ajouté au-delà de l'API indicative du cahier des
charges — nécessaire pour qu'un frontend liste les conversations, pas juste en affiche une).

**Tester** : prompt builder et réécriture de requête en tests unitaires purs. Le pipeline
complet (refus déterministe, réponse groundée avec citations, continuité sur plusieurs
tours, isolation entre utilisateurs) est testé avec un **chat provider factice
déterministe** — même principe que pour MinIO et les embeddings : jamais de dépendance
réseau ou de clé API dans les tests.

## Limites connues

- Citations = toutes les sources récupérées, pas un parsing des `[n]` réellement cités
  (voir "Pourquoi").
- Pas de streaming de la réponse (le client attend la réponse complète) — prévu au
  backlog futur (§13 du cahier des charges).
