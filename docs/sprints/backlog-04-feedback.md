# Backlog §13 — Feedback utilisateur & boucle d'amélioration

## Quoi

Notation 👍/👎 (avec commentaire optionnel) sur chaque réponse de l'assistant, upsert par
utilisateur/message, et un endpoint admin pour passer en revue le feedback négatif avec son
contexte complet. Câblé jusqu'au frontend (boutons dans `chat-content.tsx`).

## Pourquoi

**Upsert plutôt qu'accumulation** : un utilisateur qui change d'avis (clique 👍 puis se
rend compte que la réponse était fausse) doit pouvoir corriger son avis, pas empiler un
second enregistrement contradictoire. Contrainte d'unicité `(message_id, user_id)` en base
+ logique d'upsert côté route — un seul avis par personne et par message, toujours à jour.

**Le feedback ne s'applique qu'aux réponses, jamais aux questions** : noter sa propre
question n'aurait pas de sens. Validation explicite (422) si on essaie de noter un message
`USER` plutôt que `ASSISTANT`.

**L'endpoint admin renvoie le contexte complet, pas juste l'avis brut** : un like/dislike
seul ("message_id=xyz, down") ne dit rien d'exploitable. `GET /admin/feedback` fait une
jointure jusqu'au contenu du message, la knowledge base concernée et l'utilisateur — pour
qu'un admin puisse effectivement repérer un pattern ("plusieurs 👎 sur les réponses de telle
base, souvent sans commentaire" → peut-être un problème de chunking ou de documents
manquants sur ce sujet).

**Compteurs de feedback dans `/admin/metrics`** : `total_feedback_up`/`total_feedback_down`
donnent un signal agrégé immédiat (taux de satisfaction global) sans avoir à parcourir le
détail — utile en complément de `GET /admin/feedback` qui donne le détail exploitable.

## Comment

**Modèle** : `MessageFeedback` (`app/models/feedback.py`) — `message_id`, `user_id`,
`rating` (UP/DOWN), `comment` optionnel, contrainte d'unicité composite.

**Routes** (`app/api/routes/feedback.py`) :
- `POST /messages/{id}/feedback` — upsert, `{"rating": "up"|"down", "comment": "..."}`.
- `DELETE /messages/{id}/feedback` — retirer son avis.

**`GET /conversations/{id}`** (chat.py) renvoie maintenant `feedback: "up"|"down"|null` sur
chaque message — l'avis de l'utilisateur courant sur CE message précis, pour que le
frontend sache s'il a déjà été noté sans requête supplémentaire.

**Admin** (`app/api/routes/admin.py`) :
- `GET /admin/feedback?rating=down` — liste enrichie (contenu du message, KB, email de
  l'auteur), paginée.
- `GET /admin/metrics` — `total_feedback_up`/`total_feedback_down` ajoutés aux compteurs
  existants.

**Frontend** (`chat-content.tsx`) — boutons 👍/👎 sous chaque réponse de l'assistant,
appelant `api.submitFeedback()`, mise à jour optimiste du cache React Query.

**Bug trouvé et corrigé en câblant le frontend** : le message assistant affiché juste après
l'envoi recevait un ID local généré côté client (`local-a-...`), pas le vrai ID renvoyé par
le backend — noter cette réponse aurait échoué (404) jusqu'au prochain rechargement de la
conversation. `SendMessageResult` n'exposait tout simplement pas le champ `message_id`
pourtant déjà reçu de l'API. Corrigé en ajoutant `messageId` à l'interface et en l'utilisant
pour construire le message optimiste.

**Tester** :
```bash
pytest -v tests/test_feedback.py
```

## Limites connues

- Pas de vue "Réponses vérifiées" alimentée automatiquement par le feedback positif — le
  backlog §13 prévoit cette fonctionnalité séparément (bibliothèque de réponses vérifiées,
  déjà esquissée côté frontend en mock) ; le feedback pourrait l'alimenter plus tard mais ce
  n'est pas fait dans cette passe.
- Pas de notification admin en cas de pic de feedback négatif — consultation manuelle de
  `GET /admin/feedback` pour l'instant.
