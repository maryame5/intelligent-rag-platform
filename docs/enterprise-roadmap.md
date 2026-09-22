# Roadmap Enterprise B2B — au-delà du chatbot documentaire

## Pourquoi ce document

Le système actuel (Sprints 0-7) est un **moteur RAG solide et bien testé** : ingestion,
retrieval hybride, génération groundée, évaluation, observabilité. C'est la fondation
technique nécessaire. Mais techniquement solide ≠ vendable à une entreprise.

Une entreprise n'achète pas "un système qui répond à des questions sur des documents" — ça,
elle peut l'obtenir gratuitement avec ChatGPT + upload de fichier. Elle achète la résolution
d'un problème qu'elle a déjà et qu'elle n'arrive pas à résoudre autrement :

- **"Notre documentation est éparpillée et personne ne sait ce qui est à jour."**
  → Connecteurs qui gardent la base à jour automatiquement, pas un upload manuel ponctuel.
- **"On ne sait pas ce que nos employés ne trouvent pas."**
  → Analytics sur les questions sans réponse = carte des trous de la documentation.
- **"Notre service juridique/sécurité doit valider l'outil avant qu'on le déploie."**
  → SSO, audit log, résidence des données, conformité — sans ça, l'outil n'entre jamais en
    production dans une entreprise de taille moyenne ou grande.
- **"On veut contrôler qui voit quoi et combien ça coûte."**
  → Permissions granulaires par équipe, quotas et alertes de coût par département.

Ce document priorise les évolutions du backend par **valeur business démontrable**, pas par
facilité technique. Chaque pilier explique explicitement ce qui se vend, pas seulement ce qui
se code.

---

## Pilier 1 — Multi-tenant & gouvernance (fondation de la vente B2B)

**Le problème business** : aujourd'hui, `User` et `KnowledgeBase` n'ont pas de notion
d'organisation. Une entreprise de 200 personnes ne peut pas être cliente — il n'y a pas de
concept d'équipe, d'inviter des collègues, de rôles différenciés par knowledge base. C'est la
différence entre un outil personnel et un outil d'entreprise.

**Ce qui apporte de la valeur** :
- **Workspace** (l'organisation) avec facturation et quotas au niveau de l'organisation, pas
  de l'utilisateur individuel — condition sine qua non pour signer un contrat B2B.
- **Rôles par Workspace** (Owner/Admin/Member) + **permissions par Knowledge Base**
  (privée/équipe/toute l'organisation) — un cabinet d'avocats ne veut pas que le stagiaire
  voie les dossiers sensibles, mais veut que toute l'équipe RH voie la base RH.
- **Invitations et gestion d'équipe** — onboarding de nouveaux employés sans intervention
  technique.

**Ce que ça implique techniquement** : nouvelles tables `Workspace`, `WorkspaceMembership`
(user_id, workspace_id, role), `KnowledgeBasePermission` (kb_id, principal — utilisateur ou
équipe — niveau d'accès). Migration des KB/Documents existants pour rattacher à un workspace.
RBAC étendu au-delà de USER/ADMIN global.

**Pourquoi c'est le Sprint 8, en premier** : tout le reste (connecteurs partagés, analytics
par équipe, quotas de coût) suppose qu'un "workspace" existe déjà comme concept de données.
Sans ça, chaque pilier suivant devrait être retravaillé plus tard.

---

## Pilier 2 — Connecteurs & fraîcheur automatique (le plus gros driver de valeur réel)

**Le problème business** : le pipeline actuel exige un upload manuel. En pratique, la
documentation d'entreprise vit dans Google Drive, Confluence, SharePoint, Notion, Slack — et
personne ne va re-uploader manuellement un fichier à chaque mise à jour. Un outil qui devient
obsolète en deux semaines n'a aucune valeur, même avec un excellent moteur RAG derrière.

**Ce qui apporte de la valeur** :
- **Connecteurs avec synchronisation planifiée** (Google Drive, Confluence, SharePoint en
  priorité — ce sont les trois systèmes documentaires les plus courants en entreprise).
- **Détection de changement** : ré-indexer uniquement les documents modifiés, pas tout
  reprendre à zéro (coût et latence).
- **Traçabilité de la source** : chaque chunk garde un lien vers le document source d'origine
  (URL Confluence, chemin Drive) — l'utilisateur clique sur une citation et arrive sur le
  document réel, pas une copie figée.

**Ce que ça implique techniquement** : un modèle `Source` (type connecteur, credentials
chiffrés, dernière synchro, statut) découplé de `Document` (un `Document` a maintenant une
`source_id` optionnelle). Une tâche Celery périodique (`celery beat`) par source qui liste les
fichiers modifiés depuis la dernière synchro et déclenche l'ingestion existante — **le
pipeline d'ingestion du Sprint 2 ne change pas**, seul le déclencheur change (webhook/synchro
planifiée au lieu d'un upload HTTP direct).

**Pourquoi c'est stratégique** : c'est la fonctionnalité qui distingue le plus nettement
"outil qu'on utilise deux fois puis qu'on oublie" de "système qui vit dans le quotidien de
l'entreprise".

---

## Pilier 3 — Intelligence business (transformer l'outil en actif stratégique)

**Le problème business** : aujourd'hui, le système répond à des questions et s'arrête là.
Mais les questions posées à un système RAG d'entreprise sont elles-mêmes une donnée business
extrêmement précieuse — personne d'autre ne les voit.

**Ce qui apporte de la valeur** (c'est le pilier qui transforme le produit de "chatbot" en
"outil de pilotage") :
- **Détection des trous de documentation** : chaque réponse "information non trouvée"
  (`grounded=false`, déjà tracké depuis le Sprint 4) est un signal direct — "vos employés
  cherchent une information sur X et elle n'existe nulle part dans vos documents." Agrégé et
  classé par fréquence, ça devient un rapport que l'équipe documentation peut directement
  agir dessus. **Aucun concurrent chatbot basique ne fournit ça.**
- **Sujets tendance** : quelles questions reviennent le plus, par équipe, par période — utile
  pour prioriser quoi documenter en premier.
- **Tableau de bord d'adoption** : qui utilise l'outil, quelles knowledge bases sont
  consultées, lesquelles sont mortes (jamais interrogées depuis 60 jours = à archiver ou à
  enrichir).
- **Score de couverture par Knowledge Base** : % de questions récentes ayant trouvé une
  réponse groundée — un chiffre unique qu'un manager peut suivre dans le temps.

**Ce que ça implique techniquement** : ce sont essentiellement des agrégations SQL sur les
données déjà collectées (`Message`, `Conversation`, `IngestionJob` existent déjà) — pas de
nouvelle collecte de données, juste des endpoints d'agrégation
(`GET /admin/analytics/knowledge-gaps`, `GET /admin/analytics/adoption`...) et éventuellement
des tables de rollup pré-calculées si le volume devient important.

**Pourquoi c'est un argument de vente fort** : c'est ce qui permet de dire à un prospect "ce
produit ne fait pas que répondre à vos employés, il vous dit quoi documenter en priorité" —
un ROI mesurable, pas juste une commodité.

---

## Pilier 4 — Sécurité & conformité entreprise (condition d'entrée, pas un bonus)

**Le problème business** : sans ça, l'outil ne passe jamais la revue sécurité/juridique
d'une entreprise de taille moyenne ou grande — peu importe la qualité du moteur RAG. Ce n'est
pas une fonctionnalité différenciante, c'est un péage obligatoire.

**Ce qui apporte de la valeur** :
- **SSO / SAML / OIDC** : les entreprises n'acceptent pas de gérer un énième mot de passe
  isolé pour un outil interne — l'authentification doit passer par leur fournisseur
  d'identité (Okta, Azure AD, Google Workspace).
- **Logs d'audit** : qui a fait quoi, quand — connexion, suppression de document, changement
  de permission, export de données. Obligatoire pour les entreprises soumises à des
  obligations de traçabilité (finance, santé, secteur public).
- **Résidence et rétention des données** : pouvoir dire précisément où les données sont
  stockées et combien de temps elles sont conservées — question systématique en due diligence
  fournisseur.
- **Chiffrement au repos** des documents sensibles dans MinIO/S3, pas juste en transit.

**Ce que ça implique techniquement** : intégration OIDC (`authlib` ou équivalent) en
complément de l'auth JWT actuelle (coexistence, pas remplacement — certains clients restent
sur email/mot de passe). Table `AuditLog` (actor_id, action, resource_type, resource_id,
metadata JSON, timestamp) avec écriture systématique sur les actions sensibles. Politique de
rétention configurable par workspace (suppression automatique après N jours).

**Pourquoi c'est non-négociable pour du B2B réel** : c'est souvent la première question posée
en avant-vente ("avez-vous le SSO ?"), avant même une démo du produit.

---

## Pilier 5 — Gouvernance des coûts (le nerf de la guerre sur un produit LLM)

**Le problème business** : un LLM peut coûter cher à l'échelle si l'usage n'est pas contrôlé
— et une entreprise qui ne peut pas prévoir/limiter ce coût ne signera pas. Actuellement, le
projet est sur des modèles gratuits (OpenRouter), mais un vrai déploiement client basculera
sur des modèles payants ou des clés API propres au client.

**Ce qui apporte de la valeur** :
- **Quotas configurables par workspace** (requêtes/jour, budget mensuel en $) — le client
  garde le contrôle, pas de facture surprise.
- **Alertes de dépassement** (à 80%, 100% du quota) — proactif, pas découvert en fin de mois.
- **Clé API "Bring Your Own Key"** : un client peut brancher sa propre clé OpenAI/Anthropic/
  Azure plutôt que de payer un surcoût sur l'infrastructure partagée — argument de vente fort
  pour les entreprises qui ont déjà une relation contractuelle avec un fournisseur LLM.
- **Répartition des coûts par équipe/projet** (déjà trackés par appel depuis le Sprint 7,
  juste besoin de les agréger par workspace/KB plutôt que globalement).

**Ce que ça implique techniquement** : `WorkspaceUsageQuota` (limites configurables),
job Celery périodique de vérification de seuil, `LLMCredential` (clé API chiffrée par
workspace, remplace la clé globale `.env` quand présente) injectée dans
`get_chat_provider()`/`get_embedding_provider()` selon le workspace de la requête en cours.

---

## Pilier 6 — Boucle de qualité continue (le produit s'améliore avec l'usage)

**Le problème business** : aujourd'hui, la qualité des réponses est figée au moment du
déploiement. Un vrai produit d'entreprise s'améliore avec l'usage réel — sinon il stagne
pendant que la documentation évolue.

**Ce qui apporte de la valeur** :
- **Feedback utilisateur** (pouce haut/bas sur chaque réponse) — déjà mentionné comme
  interaction possible côté frontend, mais il faut le backend pour le stocker et l'exploiter.
- **Réponses vérifiées** (déjà discuté côté frontend) : un expert marque une réponse comme
  "vérifiée", elle devient réutilisable et prioritaire pour des questions similaires futures
  — la base de connaissance s'enrichit d'une couche curée par des humains, pas seulement du
  texte brut indexé.
- **A/B testing de configuration** : comparer automatiquement deux configurations (chunking,
  reranker on/off, prompt A vs B) sur du trafic réel, pas seulement sur le benchmark
  synthétique du Sprint 7 — clôture la boucle entre évaluation offline et usage réel.

**Ce que ça implique techniquement** : table `MessageFeedback` (message_id, rating, comment).
Table `VerifiedAnswer` (question canonique, réponse, sources, auteur, date de vérification) +
recherche prioritaire dedans avant de repasser par le pipeline RAG complet. Feature flag par
conversation pour router vers une configuration A ou B et comparer les métriques de feedback
entre les deux groupes.

---

## Pilier 7 — API & extensibilité (le produit devient une plateforme, pas juste une appli)

**Le problème business** : une entreprise veut souvent intégrer les réponses RAG **dans ses
propres outils** (Slack, son intranet, son CRM) plutôt que de forcer ses employés à ouvrir une
application de plus.

**Ce qui apporte de la valeur** :
- **Clés API** avec scopes (lecture seule, chat uniquement...) pour un accès programmatique.
- **Webhooks** (`document.ready`, `job.failed`, `evaluation.completed`) pour que les systèmes
  du client réagissent aux événements sans avoir à interroger l'API en boucle.
- **Bot Slack/Teams officiel** utilisant l'API existante — le canal où les employés posent
  déjà leurs questions, pas un nouvel outil à apprendre.

**Ce que ça implique techniquement** : table `ApiKey` (hash de la clé, scopes, workspace_id,
dernière utilisation), middleware d'authentification par clé API en complément du JWT.
Table `WebhookSubscription` (url, événements souscrits, secret de signature) + dispatch
asynchrone (encore une tâche Celery) lors des événements concernés.

---

## Séquencement proposé (Sprints 8+)

| Sprint | Pilier | Livrable | Pourquoi cet ordre |
|---|---|---|---|
| 8 | Multi-tenant & gouvernance | Workspaces, rôles, permissions par KB | Fondation : tout le reste en dépend |
| 9 | Connecteurs & fraîcheur | Google Drive + Confluence, sync planifiée | Plus gros driver de valeur perçue |
| 10 | Intelligence business | Knowledge gaps, adoption, couverture | Différenciateur fort, coût technique faible (agrégations sur données existantes) |
| 11 | Sécurité & conformité | SSO/OIDC, audit log, rétention | Condition d'entrée pour signer de vrais clients |
| 12 | Gouvernance des coûts | Quotas, BYOK, répartition par équipe | Nécessaire dès qu'on sort des modèles gratuits |
| 13 | Boucle de qualité | Feedback, réponses vérifiées, A/B testing | Améliore la rétention une fois le produit adopté |
| 14 | API & extensibilité | Clés API, webhooks, bot Slack | Étend la portée une fois le cœur solide |

Cet ordre n'est pas rigide — si un cas d'usage précis se dessine (ex. un client-cible qui a
un besoin urgent de SSO avant tout le reste), le séquencement peut s'adapter. Mais dans l'ordre
neutre, il maximise la valeur démontrable le plus tôt possible tout en évitant de retravailler
des fondations plus tard (multi-tenant en premier, pas en dernier).

---

## Ce qui ne change pas

Tout le travail des Sprints 0-7 reste la fondation : pipeline d'ingestion, retrieval hybride,
génération groundée, évaluation, observabilité. Ces piliers n'ajoutent pas un nouveau moteur
RAG — ils ajoutent la couche organisationnelle, commerciale et de confiance qui manque pour
qu'une entreprise puisse réellement l'acheter et le déployer.
