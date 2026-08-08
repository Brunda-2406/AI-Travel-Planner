from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database.session import get_db
from .auth.jwthandler import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from .models.user import User
    
    if not token:
        token = request.query_params.get("token")
    
    # Guest user retrieval helper
    def get_guest_user():
        guest = db.query(User).filter(User.email == "guest@example.com").first()
        if not guest:
            guest = User(email="guest@example.com", hashedpassword="guestpassword")
            db.add(guest)
            db.commit()
            db.refresh(guest)
        return guest

    if not token:
        return get_guest_user()

    try:
        payload = decode_access_token(token)
        if payload is None:
            return get_guest_user()
        
        email: str = payload.get("sub")
        if email is None:
            return get_guest_user()

        # Case-insensitive lookup so older mixed-case tokens still resolve
        from sqlalchemy import func
        user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
        if user is None:
            return get_guest_user()
        return user
    except Exception:
        return get_guest_user()
