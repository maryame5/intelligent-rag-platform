# Sprint 2 — Document ingestion

## Quoi

Upload de documents (PDF/TXT), validation, stockage MinIO, extraction de texte,
nettoyage, découpage en chunks avec métadonnées, suivi asynchrone via un système de jobs.

## Pourquoi

**Upload asynchrone, pas synchrone** : extraire le texte d'un PDF de 50 pages, le
découper et calculer ses embeddings peut prendre plusieurs secondes — inacceptable pour une
requête HTTP qui doit répondre vite. La route `POST /knowledge-bases/{id}/documents` répond
donc immédiatement (`202 Accepted`) avec un `job_id`, et le traitement réel tourne en tâche
de fond. Le client interroge `GET /jobs/{id}` pour suivre la progression.

**`BackgroundTasks` de FastAPI plutôt que Celery, pour l'instant** : Celery + Redis
apportent de la robustesse (retries automatiques, plusieurs workers, survie à un redémarrage
du serveur) mais aussi de la complexité d'infrastructure. Le cahier des charges prévoit
Celery formellement au Sprint 6 ("Async, Tests & Security"). Plutôt que de l'introduire trop
tôt, la fonction `run_ingestion(document_id, job_id)` est conçue avec l'interface exacte
qu'aurait une tâche Celery (elle ouvre sa propre session DB, ne dépend pas du cycle de la
requête HTTP) — le jour où on bascule sur Celery, seul l'appelant change, pas la logique.

**Chunking fixed-size + overlap, pas encore "recursive"** : le cahier des charges (§6)
prévoit de commencer simple puis de tester le chunking récursif. Fixed-size (1000
caractères, 200 de chevauchement) est prévisible et facile à raisonner dessus — bon point de
départ pour avoir un système qui marche, avant d'investir dans une stratégie plus fine.

**Chunking page par page, pas sur le texte concaténé** : chaque chunk garde une métadonnée
`page` fiable, indispensable pour les citations (Sprint 4). Concaténer tout le texte d'abord
aurait cassé cette traçabilité.

## Comment

**Pipeline complet** :
```
Upload → validation (type MIME + taille) → stockage MinIO → 202 + job_id
                                                                    ↓ (tâche de fond)
                                          Extraction (pypdf, page par page) 
                                                    ↓
                                          Nettoyage (espaces, sauts de ligne)
                                                    ↓
                                          Chunking (1000 car., overlap 200)
                                                    ↓
                                          Chunks persistés en base
                                                    ↓
                                          Document.status = READY (ou FAILED)
```

**Fichiers clés** (`app/services/`) :
- `validation.py` — types acceptés (PDF, TXT), taille max (20 MB).
- `storage.py` — wrapper MinIO (upload/download/delete), isolé pour être remplaçable en test.
- `extraction.py` — `pypdf` pour le PDF (retourne texte par page), décodage direct pour TXT.
- `cleaning.py` — normalisation basique (espaces, sauts de ligne, octets nuls).
- `chunking.py` — fixed-size + overlap, index de chunk global (pas remis à zéro par page).
- `ingestion.py` — orchestre tout ce qui précède.

**Modèles ajoutés** : `Chunk` (document_id, chunk_index, content, page, section),
`IngestionJob` (document_id, status PENDING/RUNNING/SUCCESS/FAILED, error_message).

**Tester** : les fonctions de `chunking.py`, `cleaning.py`, `validation.py` sont pures
(aucune dépendance externe) — testées directement. Le pipeline complet est testé avec un
**client MinIO simulé en mémoire** (`tests/test_ingestion_upload.py`) : pas besoin d'un
vrai serveur MinIO pour vérifier que upload → extraction → chunking → statut fonctionne.

## Limites connues

- Extraction PDF basique (`pypdf`) : pas d'OCR pour les PDF scannés (image pure) — prévu
  au backlog futur (§13 du cahier des charges).
- Pas de déduplication de documents (même fichier uploadé deux fois = deux entrées).
- Le chunking ne respecte pas les frontières de phrases/paragraphes — un chunk peut couper
  une phrase en plein milieu. Acceptable pour le MVP, à améliorer avec le chunking récursif.
