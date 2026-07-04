import json
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from auth.models import UserInDB, UserOut, TokenData, ROLE_PERMISSIONS
from config.settings import settings


def _users_file_path() -> str:
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, settings.users_file)


def load_users() -> list[dict]:
    path = _users_file_path()
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)


def save_users(users: list[dict]) -> None:
    path = _users_file_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(users, f, indent=2)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def get_user(username: str) -> Optional[UserInDB]:
    users = load_users()
    for u in users:
        if u["username"] == username:
            return UserInDB(**u)
    return None


def get_user_by_email(email: str) -> Optional[UserInDB]:
    users = load_users()
    for u in users:
        if u["email"].lower() == email.lower():
            return UserInDB(**u)
    return None


def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    """Authenticate by email (case-insensitive) and password."""
    user = get_user_by_email(email.lower().strip())
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            return None
        return TokenData(username=username)
    except JWTError:
        return None


def user_to_out(user: UserInDB) -> UserOut:
    permissions = ROLE_PERMISSIONS.get(user.role, [])
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        permissions=permissions,
    )


def create_user(user_data: dict) -> UserOut:
    users = load_users()
    # Check uniqueness
    for u in users:
        if u["username"] == user_data["username"]:
            raise ValueError("Username already exists")
        if u["email"] == user_data["email"]:
            raise ValueError("Email already exists")

    new_id = str(max([int(u["id"]) for u in users], default=0) + 1)
    hashed = get_password_hash(user_data["password"])
    new_user = {
        "id": new_id,
        "username": user_data["username"],
        "email": user_data["email"],
        "full_name": user_data["full_name"],
        "role": user_data.get("role", "QA Analyst"),
        "hashed_password": hashed,
        "is_active": True,
    }
    users.append(new_user)
    save_users(users)
    return user_to_out(UserInDB(**new_user))
