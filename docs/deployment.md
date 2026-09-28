# Déploiement démo (VPS + Docker Compose + Caddy)

Prérequis : un VPS (2 vCPU / 4 Go RAM conseillé), Docker + Compose, deux enregistrements DNS
(`APP_DOMAIN` et `API_DOMAIN`) pointant vers le serveur, ports 80/443 ouverts.

```bash
cp .env.prod.example .env.prod
# remplir les secrets, notamment : openssl rand -hex 32
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

- Le backend refuse de démarrer si `SECRET_KEY` est faible ou par défaut (`ENVIRONMENT=production`).
- Seul Caddy est exposé publiquement sur les ports 80/443 ; `/metrics` est bloqué côté API publique.
- Monitoring optionnel : `--profile monitoring`, puis tunnel SSH vers Grafana ou Prometheus.
- L'URL de l'API est fixée au build du frontend : reconstruire l'image si `API_DOMAIN` change.
- Vérification : `curl https://$API_DOMAIN/health`, puis le smoke test contre l'instance.