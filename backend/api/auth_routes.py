from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from auth.utils import authenticate_user, create_access_token, create_user, user_to_out
from auth.models import Token, UserCreate, UserOut
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class EmailLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login", response_model=Token)
async def login(request: EmailLoginRequest):
    """Login with email + password."""
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_to_out(user),
    )


@router.post("/register", response_model=UserOut, status_code=201)
async def register(user_data: UserCreate):
    try:
        new_user = create_user(user_data.model_dump())
        return new_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserOut)
async def me(current_user: UserOut = Depends(get_current_user)):
    return current_user
