from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

from auth.utils import authenticate_user, create_access_token, create_user, delete_user, load_users, save_users, user_to_out
from auth.models import Token, UserCreate, UserOut, Role, ROLE_PERMISSIONS, UserInDB
from auth.dependencies import get_current_user, require_permission

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


class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    custom_permissions: Optional[list[str]] = None


class UserCreateAdmin(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str = "QA Analyst"


@router.get("/users", response_model=list[UserOut])
async def list_users(current_user: UserOut = Depends(require_permission("user_management"))):
    users = load_users()
    return [user_to_out(UserInDB(**u)) for u in users]


@router.post("/users", response_model=UserOut, status_code=201)
async def admin_create_user(
    user_data: UserCreateAdmin,
    current_user: UserOut = Depends(require_permission("user_management")),
):
    try:
        new_user = create_user(user_data.model_dump())
        return new_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    current_user: UserOut = Depends(require_permission("user_management")),
):
    users = load_users()
    for u in users:
        if u["id"] == user_id:
            if body.role is not None:
                if body.role not in [r.value for r in Role]:
                    raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}")
                u["role"] = body.role
            if body.is_active is not None:
                u["is_active"] = body.is_active
            if body.custom_permissions is not None:
                u["custom_permissions"] = body.custom_permissions
            elif body.role is not None:
                u.pop("custom_permissions", None)
            save_users(users)
            return user_to_out(UserInDB(**u))
    raise HTTPException(status_code=404, detail="User not found")


@router.delete("/users/{user_id}", status_code=204)
async def delete_user_endpoint(
    user_id: str,
    current_user: UserOut = Depends(require_permission("user_management")),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    users = load_users()
    target = next((u for u in users if u["id"] == user_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["username"] == "Admin":
        raise HTTPException(status_code=400, detail="Cannot delete the Admin user")
    if not delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
