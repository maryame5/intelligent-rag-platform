from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


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


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def get_owned_kb(db: Session, kb_id, user: User) -> KnowledgeBase:
    """Récupère une knowledge base en vérifiant l'ownership. Centralisé ici pour
    éviter la duplication entre les routes knowledge_bases/retrieval/chat — et
    garantir un comportement identique (404, jamais 403, pour ne pas révéler
    l'existence d'une KB à quelqu'un qui n'y a pas accès)."""
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id, KnowledgeBase.owner_id == user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb
