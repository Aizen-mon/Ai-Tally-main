# Backend (Flask + SQLite)

## Setup

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

The API listens on http://127.0.0.1:5000/api

To point the frontend at this API, set:

```bash
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```
