from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.schemas.user import (
    AccessTokenOut,
    RefreshRequest,
    TokenPair,
    UserCreate,
    UserLogin,
    UserOut,
    UserPasswordChange,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_count = db.query(User).count()
    if payload.role is not None:
        role = payload.role
    else:
        role = UserRole.ADMIN if user_count == 0 else UserRole.USER

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.flush()

    # Create default workspace for new user
    ws_name = f"Workspace de {payload.email.split('@')[0]}"
    ws = Workspace(name=ws_name, created_by=user.id)
    db.add(ws)
    db.flush()

    ws_member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=user.id,
        role=WorkspaceRole.ADMIN,
    )
    db.add(ws_member)

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenPair(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=AccessTokenOut)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
    )
    try:
        token_payload = decode_token(payload.refresh_token)
        if token_payload.get("type") != "refresh":
            raise credentials_exception
        user_id = token_payload.get("sub")
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    return AccessTokenOut(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Met à jour le profil de l'utilisateur connecté (display_name pour l'instant)."""
    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip() or None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    payload: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permet à l'utilisateur connecté de changer son mot de passe."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères"
        )
    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Mot de passe modifié avec succès"}

