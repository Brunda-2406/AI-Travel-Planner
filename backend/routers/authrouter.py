import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..models.user import User
from ..schemas.authschemas import UserRegister, UserLogin, Token, UserProfile
from ..auth.password import get_password_hash, verify_password
from ..auth.jwthandler import create_access_token, create_refresh_token, decode_refresh_token
from ..dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def _normalize_email(email: str) -> str:
    """Lowercase + strip so Bulla@GMail.com == bulla@gmail.com."""
    return (email or "").strip().lower()


def _find_user_by_email(db: Session, email: str) -> User:
    """Case-insensitive lookup — old accounts may have been stored with mixed case."""
    return db.query(User).filter(func.lower(User.email) == email.lower().strip()).first()


@router.post("/register", response_model=Token)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    email = _normalize_email(user_data.email)
    if not EMAIL_RE.match(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid email address (e.g. name@gmail.com)."
        )
    if not user_data.password or len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters long."
        )

    existing = _find_user_by_email(db, email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed = get_password_hash(user_data.password)
    new_user = User(email=email, hashedpassword=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access = create_access_token(data={"sub": new_user.email})
    refresh = create_refresh_token(data={"sub": new_user.email})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    email = _normalize_email(credentials.email)
    user = _find_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This email is not registered. Please create an account first.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not verify_password(credentials.password, user.hashedpassword):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access = create_access_token(data={"sub": user.email})
    refresh = create_refresh_token(data={"sub": user.email})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    email = payload.get("sub")
    user = _find_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    access = create_access_token(data={"sub": user.email})
    refresh = create_refresh_token(data={"sub": user.email})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
