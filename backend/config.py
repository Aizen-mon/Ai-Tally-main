import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(DATA_DIR, "app.db"))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(DATA_DIR, "uploads"))

STT_MODEL = os.environ.get("STT_MODEL", "base")
TALLY_ENDPOINT = os.environ.get("TALLY_ENDPOINT")
OFFLINE_ONLY = os.environ.get("OFFLINE_ONLY", "true").lower() in {"1", "true", "yes"}
