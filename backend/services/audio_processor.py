import os
from uuid import uuid4

from config import UPLOAD_DIR


def save_upload(file_storage) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = file_storage.filename or "audio.wav"
    ext = os.path.splitext(filename)[1].lower() or ".wav"
    safe_name = f"audio_{uuid4().hex[:8]}{ext}"
    path = os.path.join(UPLOAD_DIR, safe_name)
    file_storage.save(path)
    return path
