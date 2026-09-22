#!/usr/bin/env bash
#
# Test manuel bout-en-bout du backend, indépendant du frontend.
# Utile pour vérifier que le backend fonctionne AVANT de blâmer le frontend
# si quelque chose casse pendant l'intégration.
#
# Prérequis : backend lancé (docker compose up -d), `jq` installé.
# Usage : bash docs/testing/smoke_test.sh

set -euo pipefail

API="http://localhost:8000"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="testpassword123"
DOC_PATH="$(dirname "$0")/sample-document.md"

step() { echo -e "\n\033[1;34m▸ $1\033[0m"; }
ok()   { echo -e "\033[1;32m✓ $1\033[0m"; }
fail() { echo -e "\033[1;31m✗ $1\033[0m"; exit 1; }

step "0. Vérification que le backend répond"
curl -sf "$API/health" > /dev/null || fail "Backend inaccessible sur $API — lance 'docker compose up -d' d'abord."
ok "Backend en ligne."

step "1. Inscription ($EMAIL)"
curl -sf -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null
ok "Compte créé."

step "2. Connexion"
TOKENS=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
ACCESS_TOKEN=$(echo "$TOKENS" | jq -r '.access_token')
[ "$ACCESS_TOKEN" != "null" ] || fail "Pas d'access_token reçu."
ok "Connecté."
AUTH=(-H "Authorization: Bearer $ACCESS_TOKEN")

step "3. Création d'une knowledge base"
KB=$(curl -sf -X POST "$API/knowledge-bases" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"Test RH"}')
KB_ID=$(echo "$KB" | jq -r '.id')
ok "Knowledge base créée : $KB_ID"

step "4. Upload de $DOC_PATH"
[ -f "$DOC_PATH" ] || fail "Fichier de test introuvable : $DOC_PATH"
UPLOAD=$(curl -sf -X POST "$API/knowledge-bases/$KB_ID/documents" \
  "${AUTH[@]}" \
  -F "file=@$DOC_PATH;type=text/markdown")
JOB_ID=$(echo "$UPLOAD" | jq -r '.job_id')
DOC_ID=$(echo "$UPLOAD" | jq -r '.document.id')
ok "Document uploadé (job $JOB_ID)."

step "5. Attente de la fin du traitement (polling GET /jobs/{id})"
for i in $(seq 1 20); do
  JOB=$(curl -sf "$API/jobs/$JOB_ID" "${AUTH[@]}")
  STATUS=$(echo "$JOB" | jq -r '.status')
  echo "   tentative $i : $STATUS"
  [ "$STATUS" = "SUCCESS" ] && break
  [ "$STATUS" = "FAILED" ] && fail "Job échoué : $(echo "$JOB" | jq -r '.error_message')"
  sleep 1.5
done
[ "$STATUS" = "SUCCESS" ] || fail "Le job n'a pas terminé à temps."
ok "Document indexé avec succès."

step "6. Vérification du statut du document"
DOC_STATUS=$(curl -sf "$API/documents/$DOC_ID" "${AUTH[@]}" | jq -r '.status')
[ "$DOC_STATUS" = "READY" ] || fail "Statut inattendu : $DOC_STATUS"
ok "Document au statut READY."

step "7. Recherche sémantique — question ANCRÉE dans le document"
SEARCH=$(curl -sf -X POST "$API/knowledge-bases/$KB_ID/search" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"query":"Combien de jours de congés payés par an ?","top_k":3}')
echo "$SEARCH" | jq -r '.[] | "   score=\(.score | tostring | .[0:5])  \(.content[0:70])..."'
NB_RESULTS=$(echo "$SEARCH" | jq 'length')
[ "$NB_RESULTS" -gt 0 ] || fail "Aucun résultat retourné — vérifie LLM_API_KEY dans .env."
ok "$NB_RESULTS chunk(s) trouvé(s)."

step "8. Chat — question ANCRÉE (doit citer le document)"
CHAT=$(curl -sf -X POST "$API/chat" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"knowledge_base_id\":\"$KB_ID\",\"message\":\"Combien de jours de télétravail par semaine ?\"}")
GROUNDED=$(echo "$CHAT" | jq -r '.grounded')
echo "   Réponse : $(echo "$CHAT" | jq -r '.answer' | head -c 200)"
echo "   grounded=$GROUNDED"
[ "$GROUNDED" = "true" ] || fail "Attendu grounded=true (la réponse est dans le document)."
ok "Réponse ancrée avec citations, comme attendu."

step "9. Chat — question HORS SUJET (doit déclencher le refus déterministe)"
CHAT2=$(curl -sf -X POST "$API/chat" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"knowledge_base_id\":\"$KB_ID\",\"message\":\"Quelle est la capitale de la Mongolie ?\"}")
GROUNDED2=$(echo "$CHAT2" | jq -r '.grounded')
echo "   Réponse : $(echo "$CHAT2" | jq -r '.answer')"
echo "   grounded=$GROUNDED2"
[ "$GROUNDED2" = "false" ] || fail "Attendu grounded=false (question hors périmètre du document)."
ok "Refus déterministe déclenché comme attendu — pas d'hallucination."

echo -e "\n\033[1;32m✔ Tous les tests sont passés.\033[0m"
echo "Knowledge base de test : $KB_ID (visible dans le frontend une fois connecté avec $EMAIL / $PASSWORD)"
