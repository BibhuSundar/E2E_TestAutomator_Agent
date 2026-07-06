"""
File Routes — handle file uploads (input/) and output saving.
Organized by agent subfolders:
  input/{folder}/   and   output/{folder}/
"""
import uuid
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import PlainTextResponse
from auth.dependencies import get_current_user
from auth.models import UserOut

AGENT_FOLDER_MAP = {
    "product_requirement": "requirement",
    "planning": "planning",
    "test_strategy": "strategy",
    "designing": "design",
    "automation": "automation",
    "code_review": "code_review",
    "execution": "execution",
    "deployer": "deployer",
}


class SaveOutputRequest(BaseModel):
    agent: str
    content: str

router = APIRouter(prefix="/api/files", tags=["files"])

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = BASE_DIR / "input"
OUTPUT_DIR = BASE_DIR / "output"

INPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf", ".doc", ".docx"}


def _agent_folder(agent_id: str) -> str:
    return AGENT_FOLDER_MAP.get(agent_id, agent_id.replace(" ", "_").lower())


def _ensure_subdir(base: Path, folder: str) -> Path:
    sub = base / folder
    sub.mkdir(parents=True, exist_ok=True)
    return sub


def _extract_text(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    if ext in (".txt", ".md"):
        return file_path.read_text(encoding="utf-8", errors="replace")
    elif ext == ".pdf":
        import fitz
        doc = fitz.open(str(file_path))
        return "\n\n".join(page.get_text() for page in doc)
    elif ext in (".docx", ".doc"):
        import docx
        doc = docx.Document(str(file_path))
        return "\n".join(p.text for p in doc.paragraphs)
    return ""


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    agent: str = Query("product_requirement", description="Agent ID to route file to the correct subfolder"),
    current_user: UserOut = Depends(get_current_user),
):
    ext = Path(file.filename or "file.txt").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    folder = _agent_folder(agent)
    dest_dir = _ensure_subdir(INPUT_DIR, folder)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_name = f"{stamp}_{uuid.uuid4().hex[:8]}{ext}"
    dest = dest_dir / unique_name

    content = await file.read()
    dest.write_bytes(content)

    text = _extract_text(dest)

    return {
        "file_path": str(dest),
        "file_name": file.filename,
        "saved_as": unique_name,
        "folder": folder,
        "text": text,
        "char_count": len(text),
    }


@router.post("/save-output")
async def save_output(
    body: SaveOutputRequest,
    current_user: UserOut = Depends(get_current_user),
):
    folder = _agent_folder(body.agent)
    dest_dir = _ensure_subdir(OUTPUT_DIR, folder)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_agent = body.agent.replace(" ", "_").lower()
    unique_name = f"{stamp}_{safe_agent}_{uuid.uuid4().hex[:8]}.txt"
    dest = dest_dir / unique_name

    dest.write_text(body.content, encoding="utf-8")

    return {
        "file_path": str(dest),
        "saved_as": f"{folder}/{unique_name}",
        "folder": folder,
        "char_count": len(body.content),
    }


@router.get("/list-output")
async def list_output(
    agent: str = Query(None, description="Filter by agent ID — returns files from the corresponding subfolder"),
    current_user: UserOut = Depends(get_current_user),
):
    search_dir = OUTPUT_DIR
    if agent:
        folder = _agent_folder(agent)
        search_dir = search_dir / folder

    if not search_dir.exists():
        return {"files": []}

    files = []
    for f in sorted(search_dir.iterdir(), reverse=True):
        if f.suffix.lower() == ".txt" and f.name != ".gitkeep":
            files.append({
                "name": f.name,
                "size": f.stat().st_size,
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
    return {"files": files}


@router.get("/read-output/{filename:path}")
async def read_output(
    filename: str,
    current_user: UserOut = Depends(get_current_user),
):
    dest = OUTPUT_DIR / filename
    if not dest.exists() or not dest.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")
    return PlainTextResponse(dest.read_text(encoding="utf-8"))
