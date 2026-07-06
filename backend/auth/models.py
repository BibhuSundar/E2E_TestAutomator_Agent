from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class Role(str, Enum):
    admin = "Admin"
    qa_manager = "QA Manager"
    qa_lead = "QA Lead"
    qa_analyst = "QA Analyst"


# Role-based permission matrix
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "Admin": [
        "dashboard", "product_requirement", "planning", "test_strategy", "designing",
        "automation", "code_review", "execution", "deployer",
        "configure", "support", "user_management"
    ],
    "QA Manager": [
        "dashboard", "product_requirement", "planning", "test_strategy", "designing",
        "automation", "code_review", "execution", "deployer",
        "configure", "support"
    ],
    "QA Lead": [
        "dashboard", "product_requirement", "planning", "test_strategy", "designing",
        "automation", "code_review", "execution", "support"
    ],
    "QA Analyst": [
        "dashboard", "product_requirement", "planning",
        "automation", "code_review", "support"
    ],
}


class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: str


class UserCreate(UserBase):
    password: str


class UserInDB(UserBase):
    id: str
    hashed_password: str
    is_active: bool = True
    custom_permissions: Optional[list[str]] = None


class UserOut(UserBase):
    id: str
    is_active: bool
    permissions: list[str] = []


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class TokenData(BaseModel):
    username: Optional[str] = None
