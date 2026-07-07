"""
Jira Routes — fetch issue details by key and create issues.

Requires in .env:
  JIRA_BASE_URL   = https://your-org.atlassian.net
  JIRA_EMAIL      = your-email@example.com
  JIRA_API_TOKEN  = your-jira-api-token

Get a token at: https://id.atlassian.com/manage-profile/security/api-tokens
"""
import httpx
import base64

from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user
from auth.models import UserOut
from config.settings import settings
from pydantic import BaseModel

router = APIRouter(prefix="/api/jira", tags=["jira"])


class CreateIssueRequest(BaseModel):
    project_key: str
    summary: str
    description: str
    issue_type: str = "Story"


def _get_auth_header() -> str:
    """Basic auth header for Jira Cloud REST API."""
    credentials = f"{settings.jira_email}:{settings.jira_api_token}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


@router.get("/issue/{issue_key}")
async def fetch_jira_issue(
    issue_key: str,
    current_user: UserOut = Depends(get_current_user),
):
    """
    Fetch a Jira issue by key and return a formatted summary
    suitable for use as product requirement input.
    """
    if not settings.jira_base_url or not settings.jira_email or not settings.jira_api_token:
        raise HTTPException(
            status_code=503,
            detail="Jira is not configured. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN in .env"
        )

    url = f"{settings.jira_base_url.rstrip('/')}/rest/api/3/issue/{issue_key}"

    headers = {
        "Authorization": _get_auth_header(),
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Jira issue '{issue_key}' not found.")
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Jira authentication failed. Check your JIRA_EMAIL and JIRA_API_TOKEN.")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Jira API error: {resp.text}")

    data = resp.json()
    fields = data.get("fields", {})

    # Extract description text from Atlassian Document Format (ADF)
    description_text = _extract_adf_text(fields.get("description"))

    # Extract acceptance criteria from custom fields if present
    ac_text = _extract_adf_text(fields.get("customfield_10016"))  # common AC field

    # Build a clean text summary
    summary_parts = [
        f"Jira Issue: {issue_key}",
        f"Summary: {fields.get('summary', 'N/A')}",
        f"Type: {fields.get('issuetype', {}).get('name', 'N/A')}",
        f"Status: {fields.get('status', {}).get('name', 'N/A')}",
        f"Priority: {fields.get('priority', {}).get('name', 'N/A')}",
        f"Reporter: {fields.get('reporter', {}).get('displayName', 'N/A')}",
        f"Assignee: {fields.get('assignee', {}).get('displayName', 'Unassigned') if fields.get('assignee') else 'Unassigned'}",
    ]

    if description_text:
        summary_parts += ["", "Description:", description_text]

    if ac_text:
        summary_parts += ["", "Acceptance Criteria:", ac_text]

    # Labels
    labels = fields.get("labels", [])
    if labels:
        summary_parts.append(f"\nLabels: {', '.join(labels)}")

    formatted = "\n".join(summary_parts)

    return {
        "issue_key": issue_key,
        "summary": fields.get("summary", ""),
        "formatted": formatted,
        "raw": {
            "type": fields.get("issuetype", {}).get("name"),
            "status": fields.get("status", {}).get("name"),
            "priority": fields.get("priority", {}).get("name"),
            "reporter": fields.get("reporter", {}).get("displayName"),
            "assignee": fields.get("assignee", {}).get("displayName") if fields.get("assignee") else None,
            "labels": labels,
        }
    }


def _extract_adf_text(adf: dict | None) -> str:
    """Recursively extract plain text from Atlassian Document Format."""
    if not adf:
        return ""
    if isinstance(adf, str):
        return adf

    texts = []

    def walk(node):
        if not isinstance(node, dict):
            return
        if node.get("type") == "text":
            texts.append(node.get("text", ""))
        if node.get("type") in ("hardBreak", "paragraph"):
            texts.append("\n")
        for child in node.get("content", []):
            walk(child)

    walk(adf)
    return "".join(texts).strip()


@router.post("/create-issue")
async def create_jira_issue(
    req: CreateIssueRequest,
    current_user: UserOut = Depends(get_current_user),
):
    """
    Create a Jira issue (default: User Story) with the given project, summary, and description.
    Used to upload approved test plans as Jira user stories.
    """
    if not settings.jira_base_url or not settings.jira_email or not settings.jira_api_token:
        raise HTTPException(
            status_code=503,
            detail="Jira is not configured. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN in .env"
        )

    url = f"{settings.jira_base_url.rstrip('/')}/rest/api/3/issue"

    headers = {
        "Authorization": _get_auth_header(),
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    body = {
        "fields": {
            "project": {"key": req.project_key},
            "summary": req.summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": line,
                            }
                        ],
                    }
                    for line in req.description.strip().split("\n")
                    if line.strip()
                ],
            },
            "issuetype": {"name": req.issue_type},
        }
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, headers=headers, json=body)

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Jira authentication failed. Check your JIRA_EMAIL and JIRA_API_TOKEN.")
    if resp.status_code == 400:
        raise HTTPException(status_code=400, detail=f"Invalid request: {resp.text}")
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=f"Jira API error: {resp.text}")

    data = resp.json()
    return {
        "success": True,
        "issue_key": data.get("key"),
        "issue_url": f"{settings.jira_base_url.rstrip('/')}/browse/{data.get('key')}",
    }
