import os
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.dependencies import get_current_user
from auth.models import UserOut
from config.settings import settings

router = APIRouter(prefix="/api/config", tags=["config"])

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")


class JiraConfigUpdate(BaseModel):
    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_project_key: str = ""


def _mask(value: str | None) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "*" * len(value)
    return value[:4] + "*" * (len(value) - 8) + value[-4:]


def _read_env() -> dict[str, str]:
    env_vars: dict[str, str] = {}
    if not os.path.exists(ENV_PATH):
        return env_vars
    with open(ENV_PATH, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                env_vars[key.strip()] = val.strip()
    return env_vars


def _write_env(updates: dict[str, str]) -> None:
    env_vars = _read_env()
    env_vars.update(updates)

    lines: list[str] = []
    seen: set[str] = set()
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            for line in f:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key = stripped.split("=", 1)[0].strip()
                    if key in updates:
                        lines.append(f"{key}={updates[key]}\n")
                        seen.add(key)
                    else:
                        lines.append(line)
                else:
                    lines.append(line)

    for key, val in updates.items():
        if key not in seen:
            lines.append(f"{key}={val}\n")

    with open(ENV_PATH, "w") as f:
        f.writelines(lines)


@router.get("/jira")
async def get_jira_config(current_user: UserOut = Depends(get_current_user)):
    env = _read_env()
    token = env.get("JIRA_API_TOKEN", "")
    return {
        "jira_base_url": env.get("JIRA_BASE_URL", ""),
        "jira_email": env.get("JIRA_EMAIL", ""),
        "jira_api_token": _mask(token) if token else "",
        "has_token": bool(token),
        "jira_project_key": env.get("JIRA_PROJECT_KEY", ""),
    }


@router.post("/jira")
async def update_jira_config(
    body: JiraConfigUpdate,
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role not in ("Admin", "Manager"):
        raise HTTPException(status_code=403, detail="Only Admin or Manager can update configuration.")

    updates: dict[str, str] = {}
    if body.jira_base_url:
        updates["JIRA_BASE_URL"] = body.jira_base_url
    if body.jira_email:
        updates["JIRA_EMAIL"] = body.jira_email
    if body.jira_api_token:
        updates["JIRA_API_TOKEN"] = body.jira_api_token
    if body.jira_project_key:
        updates["JIRA_PROJECT_KEY"] = body.jira_project_key

    _write_env(updates)

    return {"message": "Jira configuration updated successfully."}
