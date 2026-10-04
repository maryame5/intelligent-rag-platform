# RAG Platform — Frontend

Interface moderne et performante pour la plateforme RAG d'entreprise, construite avec **React 19**, **TanStack Start**, **Vite** et **Tailwind CSS**.

## Architecture & Fonctionnalités

- **Gestion des bases de connaissances** : création, consultation, upload multi-formats de documents (PDF, DOCX, TXT, HTML, Markdown), suivi d'ingestion en temps réel.
- **Recherche documentaire hybride** : moteur de recherche vectoriel et hybride (BM25 + Dense + Reranking) avec comparaison de pertinence.
- **Chat RAG interactif** : streaming SSE temps réel, citations vérifiables ancrées dans les documents, historique des conversations, feedback utilisateur (up/down vote).
- **Administration & Observabilité** : dashboard avec KPIs réels, monitoring du pipeline de documents, runs d'évaluation et observabilité.
- **Authentification & Profil** : authentification JWT intégrée avec le backend FastAPI et gestion du profil utilisateur sous PostgreSQL.

## Démarrage rapide

### 1. Prérequis

- Node.js >= 20
- Backend FastAPI démarré sur `http://localhost:8000`

### 2. Configuration

Copiez le fichier d'exemple et ajustez les variables si nécessaire :

```bash
cp .env.example .env
```

Contenu par défaut :

```env
VITE_API_BASE_URL="http://localhost:8000"
```

### 3. Installation et lancement

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement (port 8080)
npm run dev

# Compilation pour la production
npm run build

# Prévisualisation de la version de production
npm run preview
```
