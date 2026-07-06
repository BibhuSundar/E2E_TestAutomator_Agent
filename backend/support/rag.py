import os
import re
import glob
from typing import List, Optional

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
COLLECTION_NAME = "readme_chunks"
EMBED_MODEL = "nomic-ai/nomic-embed-text-v1.5"

_client = None
_collection = None


def _get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
    return _client


def _get_collection():
    global _collection
    if _collection is None:
        ef = SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)
        client = _get_client()
        _collection = client.get_or_create_collection(name=COLLECTION_NAME, embedding_function=ef)
    return _collection


def chunk_markdown(text: str, source: str) -> List[dict]:
    lines = text.split("\n")
    chunks = []
    current_section = "Introduction"
    current_lines = []

    for line in lines:
        if re.match(r"^##\s+", line):
            if current_lines:
                content = "\n".join(current_lines).strip()
                if content:
                    chunks.append({"content": content, "source": source, "section": current_section})
            current_section = re.sub(r"^##\s+", "", line).strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            chunks.append({"content": content, "source": source, "section": current_section})

    return chunks


def readme_files() -> List[str]:
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_root = os.path.dirname(base)
    files = glob.glob(os.path.join(project_root, "README.md"), recursive=False)
    for root, _dirs, _files in os.walk(project_root):
        if "node_modules" in root or ".git" in root or "venv" in root or "__pycache__" in root:
            continue
        for f in _files:
            if f.lower() == "readme.md" and os.path.join(root, f) not in files:
                files.append(os.path.join(root, f))
    return files


def index_readmes(force: bool = False):
    collection = _get_collection()
    if not force and collection.count() > 0:
        return

    chunks = []
    for path in readme_files():
        rel = os.path.basename(path)
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        chunks.extend(chunk_markdown(text, rel))

    if not chunks:
        return

    ids = [f"chunk_{i}" for i in range(len(chunks))]
    documents = [c["content"] for c in chunks]
    metadatas = [{"source": c["source"], "section": c["section"]} for c in chunks]

    try:
        collection.delete(ids=collection.get()["ids"])
    except Exception:
        pass
    collection.add(ids=ids, documents=documents, metadatas=metadatas)


def query_readmes(question: str, n_results: int = 5) -> List[dict]:
    index_readmes()
    collection = _get_collection()
    results = collection.query(query_texts=[question], n_results=n_results)
    out = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            out.append({"content": doc, "source": meta.get("source", ""), "section": meta.get("section", "")})
    return out
