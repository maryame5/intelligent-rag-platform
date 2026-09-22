# Sprint 1 — Backend & Authentication

## Quoi

Authentification complète : inscription, connexion, JWT access + refresh, RBAC
USER/ADMIN, migrations Alembic, et les premiers vrais tests API (pas juste un test de
santé).

## Pourquoi

**JWT access + refresh (deux tokens, pas un)** : l'access token a une durée de vie courte
(30 min) pour limiter les dégâts s'il est volé ; le refresh token, plus long (7 jours),
permet de renouveler l'access token sans redemander le mot de passe. C'est le compromis
standard sécurité/confort — un seul token longue durée serait plus simple mais plus risqué
en cas de fuite.

**RBAC avec seulement deux rôles (USER/ADMIN)** : le cahier des charges n'en demande pas
plus à ce stade. Ajouter des rôles granulaires (Editor, Viewer par knowledge base...) avant
d'en avoir besoin aurait été de la sur-ingénierie — ça viendra si le produit évolue vers un
usage multi-équipes réel (voir la piste "workspace" discutée pour le frontend, pas encore
implémentée côté backend).

**Migrations Alembic dès ce sprint, pas plus tard** : `Base.metadata.create_all()`
fonctionne pour les tests mais ne doit jamais servir en production — impossible de faire
évoluer un schéma existant sans perdre les données. Une fois qu'on a des vraies migrations,
chaque sprint suivant qui ajoute des tables (Sprint 2, 3, 4) en ajoute une nouvelle plutôt
que de modifier le schéma à la main.

**Vrais tests dès ce sprint** : register/login/refresh, mais surtout **l'isolation entre
utilisateurs** (un user ne voit jamais les données d'un autre — 404, jamais 403, pour ne
même pas révéler l'existence d'une ressource) et le **RBAC admin**. Ce sont les deux choses
qui, si elles cassent silencieusement, deviennent des failles de sécurité en production.

## Comment

**Flux d'inscription/connexion** :
```
POST /auth/register  → crée l'utilisateur (mot de passe haché avec bcrypt)
POST /auth/login      → vérifie le mot de passe, renvoie {access_token, refresh_token}
POST /auth/refresh    → échange un refresh_token valide contre un nouvel access_token
GET  /auth/me         → utilisateur courant (utile pour le frontend)
```

**Fichiers clés** :
- `app/core/security.py` — hashing (`bcrypt` directement, voir note ci-dessous) et JWT.
- `app/api/deps.py` — `get_current_user()` (décode le JWT, lève 401 si invalide),
  `require_admin()` (lève 403 si pas admin), `get_owned_kb()` (vérifie l'ownership d'une
  knowledge base — centralisé ici pour être réutilisé par toutes les routes qui en ont
  besoin sans dupliquer la logique).
- `alembic/versions/0001_initial_schema.py` — première migration (`users`,
  `knowledge_bases`, `documents`).

**Note technique sur le hashing** : la version initiale utilisait `passlib[bcrypt]`, qui
s'est révélé incompatible avec les versions récentes de la librairie `bcrypt` (bug connu :
`bcrypt≥4.0` lève une erreur stricte sur les mots de passe >72 octets que `passlib` 1.7.4 ne
gère pas dans son auto-détection interne). Solution : appeler `bcrypt` directement, sans
passer par `passlib`. Plus simple, moins de dépendances, et ça évite ce genre de piège de
compatibilité entre librairies.

**Tester** :
```bash
cd backend && pip install -r requirements.txt && pytest -v tests/test_auth.py tests/test_rbac.py
```

## Limites connues

- Pas de vérification d'email, pas de "mot de passe oublié" — hors scope pour un projet
  portfolio, mais à mentionner si le produit devait aller en vraie production.
- Le rôle ADMIN ne peut être attribué qu'en base directement (pas de route publique pour
  promouvoir un utilisateur) — volontaire, pour ne pas exposer de faille d'élévation de
  privilège avant d'avoir une vraie gestion d'équipe.
