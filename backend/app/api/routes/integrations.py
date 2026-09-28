import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.integration import Integration
from app.models.user import User
from app.schemas.integration import IntegrationConnectRequest, IntegrationOut

router = APIRouter(prefix="/integrations", tags=["integrations"])

DEFAULT_PROVIDERS = [
    {
        "provider": "notion",
        "name": "Notion",
        "description": "Synchronisez vos pages, bases de données et documentation d'équipe.",
        "status": "available",
    },
    {
        "provider": "gdrive",
        "name": "Google Drive",
        "description": "Indexez automatiquement les Google Docs, Sheets et PDFs de dossiers partagés.",
        "status": "available",
    },
    {
        "provider": "slack",
        "name": "Slack",
        "description": "Indexez les fils de discussion publics et répondez directement dans vos canaux.",
        "status": "available",
    },
    {
        "provider": "github",
        "name": "GitHub & GitLab",
        "description": "Indexez les README, wikis techniques et documentations Markdown de vos dépôts.",
        "status": "available",
    },
    {
        "provider": "confluence",
        "name": "Atlassian Confluence",
        "description": "Synchronisez l'ensemble de votre base de connaissances d'entreprise.",
        "status": "available",
    },
    {
        "provider": "s3",
        "name": "Amazon S3 / MinIO",
        "description": "Connectez vos buckets de stockage d'objets pour ingestion automatique.",
        "status": "available",
    },
]

@router.get("", response_model=list[IntegrationOut])
def list_integrations(
    workspace_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List integrations owned by the current user."""
    db_items = db.query(Integration).filter(Integration.user_id == current_user.id).all()
    if not db_items:
        created_items = []
        for p in DEFAULT_PROVIDERS:
            integ = Integration(
                user_id=current_user.id,
                workspace_id=workspace_id,
                provider=p["provider"],
                name=p["name"],
                description=p["description"],
                status=p["status"],
                config={},
                created_at=datetime.now(timezone.utc),
            )
            db.add(integ)
            created_items.append(integ)
        db.commit()
        for item in created_items:
            db.refresh(item)
        return created_items
    return db_items

@router.post("/{provider}/connect", response_model=IntegrationOut)
def connect_integration(
    provider: str,
    payload: IntegrationConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    integ = (
        db.query(Integration)
        .filter(Integration.provider == provider, Integration.user_id == current_user.id)
        .first()
    )
    if not integ:
        integ = Integration(
            user_id=current_user.id,
            workspace_id=payload.workspace_id,
            provider=provider,
            name=provider.capitalize(),
            description=f"Connecteur pour {provider}",
            status="connected",
            config=payload.config,
            created_at=datetime.now(timezone.utc),
        )
        db.add(integ)
    else:
        integ.status = "connected" if integ.status != "connected" else "available"
        if payload.config:
            integ.config = payload.config
    db.commit()
    db.refresh(integ)
    return integ
