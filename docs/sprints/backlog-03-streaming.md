# Backlog §13 — Streaming des réponses

## Quoi

Un nouvel endpoint `POST /chat/stream`, qui renvoie la réponse au format SSE
(Server-Sent Events) au fur et à mesure de la génération, plutôt que d'attendre la réponse
complète comme `/chat`.

## Pourquoi

**SSE plutôt que WebSocket** : le flux est unidirectionnel (serveur → client, le client
n'a rien à renvoyer pendant la génération) — SSE est le protocole le plus simple pour ce
cas précis, supporté nativement par `fetch()` côté navigateur (pas de librairie
supplémentaire), et fonctionne au-dessus de HTTP standard (pas de upgrade de protocole à
gérer côté infra/proxy comme pour WebSocket).

**Le retrieval et la décision de grounding restent synchrones, avant le premier octet
envoyé** : `/chat/stream` réutilise exactement la même logique que `/chat` (même fonction
`_prepare_turn()`) pour la recherche, le filtrage de pertinence et le refus déterministe.
Seule la génération elle-même est streamée. Ça évite un piège classique du streaming RAG :
commencer à streamer une réponse avant de savoir si le contexte est suffisant, puis devoir
"annuler" en cours de route. Ici, si le contexte est insuffisant, le message de refus est
envoyé comme un unique fragment — même comportement déterministe que `/chat`, juste dans le
format SSE.

**Pas de retry sur l'appel streamé, contrairement à `generate()`** : `generate()` (Sprint
6) a un retry avec backoff sur les erreurs réseau transitoires, appliqué avant que quoi que
ce soit ne soit renvoyé au client. Pour `generate_stream()`, un retry après que les premiers
fragments ont déjà été envoyés au client n'a pas de sens — on ne peut pas "recommencer" une
réponse à moitié affichée sans laisser un texte incohérent. Limite assumée : une coupure
réseau en plein milieu d'un stream se traduit par un événement `{"type": "error"}`, pas une
tentative de reprise transparente.

**Pas de suivi de tokens/coût pour le streaming** : contrairement à `generate()` qui lit le
champ `usage` de la réponse JSON complète, les réponses en streaming n'exposent pas toujours
ce champ de façon fiable selon le fournisseur. Simplification assumée : le streaming n'incrémente
pas les métriques Prometheus de tokens/coût (`LLM_TOKENS_TOTAL`, `LLM_COST_USD_TOTAL`) —
seul le compteur de requêtes (`LLM_REQUESTS_TOTAL`) est mis à jour. À corriger si le suivi
de coût doit devenir exhaustif (estimation par `estimate_tokens()` sur le texte accumulé,
par exemple).

## Comment

**`app/services/generation.py`** — `ChatProvider` (Protocol) gagne une méthode
`generate_stream(messages) -> Iterator[str]`. `OpenAIChatProvider.generate_stream()` appelle
l'API avec `stream: true`, parse les lignes `data: {...}` au format SSE du fournisseur,
extrait `choices[0].delta.content` de chaque fragment, s'arrête sur `data: [DONE]`.

**`app/api/routes/chat.py`** — refactorisé pour partager la logique entre les deux
endpoints :
- `_prepare_turn()` : ownership, conversation, historique, réécriture de requête, retrieval
  (vector/hybrid/expansion, avec ou sans reranking) — commun à `/chat` et `/chat/stream`.
- `_persist_assistant_message()` : sauvegarde du message assistant, commun aussi.
- `/chat` : appelle `chat_provider.generate()`, retourne un `ChatResponse` classique.
- `/chat/stream` : appelle `chat_provider.generate_stream()`, retourne un
  `StreamingResponse` (media type `text/event-stream`). Événements émis :
  `{"type": "answer_chunk", "content": "..."}` (un ou plusieurs), puis
  `{"type": "done", "conversation_id", "message_id", "grounded", "citations"}`, ou
  `{"type": "error", "message": "..."}` en cas d'échec du LLM.

**Tester** :
```bash
pytest -v tests/test_chat_streaming.py
```
Le `FakeChatProvider` des tests (`tests/conftest.py`) gagne un `generate_stream()` qui
redécoupe la réponse de `generate()` en quelques fragments — assez pour vérifier que le
client recolle correctement les morceaux, sans dépendre d'un vrai flux réseau.

## Limites connues

- **Le frontend n'est pas encore branché sur `/chat/stream`** — `chat-content.tsx` utilise
  toujours `/chat` (réponse bloquante). Câbler le streaming côté frontend demande de
  remplacer l'appel `fetch` JSON par une lecture incrémentale du corps de la réponse
  (`response.body.getReader()`, parsing des lignes `data: `) — prévu comme prochaine étape,
  pas fait dans cette passe pour rester focalisé sur le backend.
- Pas de reprise transparente en cas de coupure réseau en plein stream (voir "Pourquoi").
- Pas de suivi précis de tokens/coût pour les réponses streamées (voir "Pourquoi").
