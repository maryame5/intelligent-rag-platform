from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User, UserRole
from app.models.workspace import WorkspaceMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id = payload.get("sub")
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_optional_current_user(
    token: str | None = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)
) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None



def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user



def get_owned_kb(db: Session, kb_id, user: User) -> KnowledgeBase:
    """Récupère une knowledge base en vérifiant l'ownership ou l'appartenance au workspace.
    Centralisé ici pour éviter la duplication entre les routes knowledge_bases/retrieval/chat —
    et garantir un comportement identique (404, jamais 403, pour ne pas révéler
    l'existence d'une KB à quelqu'un qui n'y a pas accès)."""
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if kb.owner_id == user.id or user.role == UserRole.ADMIN:
        return kb

    if kb.workspace_id:
        member = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == kb.workspace_id,
                WorkspaceMember.user_id == user.id,
            )
            .first()
        )
        if member:
            return kb

    raise HTTPException(status_code=404, detail="Knowledge base not found")
