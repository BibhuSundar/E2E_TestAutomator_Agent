from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from auth.utils import decode_token, get_user, user_to_out
from auth.models import UserOut

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = decode_token(token)
    if token_data is None:
        raise credentials_exception
    user = get_user(token_data.username)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user_to_out(user)


def require_permission(permission: str):
    """Dependency factory — enforces a specific permission."""
    async def checker(current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required",
            )
        return current_user
    return checker
