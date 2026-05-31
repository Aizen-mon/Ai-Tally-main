from flask import Blueprint, jsonify, request

from services.audio_processor import save_upload
from services.ocr_service import process_ocr
from services.stt_service import STTService
from services.voice_service import process_text
from services.sync_queue import list_queue, retry_failed


api = Blueprint("api", __name__)


@api.post("/voice/transcribe")
def voice_transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "audio file is required"}), 400
    path = save_upload(request.files["audio"])
    service = STTService()
    result = service.transcribe(path)
    return jsonify(result)


@api.post("/voice/process")
def voice_process():
    data = request.get_json(silent=True) or {}
    text = data.get("text") or data.get("transcript") or ""
    if text:
        return jsonify(process_text(text))
    return jsonify({"error": "text is required"}), 400


@api.post("/parse")
def parse_text():
    data = request.get_json(silent=True) or {}
    text = data.get("text") or ""
    return jsonify(process_text(text))


@api.get("/voice/models")
def voice_models():
    service = STTService()
    return jsonify({"active": service.model_name, "available": service.available_models()})


@api.post("/ocr/process")
def ocr_process():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400
    path = save_upload(request.files["file"])
    return jsonify(process_ocr(path))


@api.get("/sync/queue")
def sync_queue():
    status = request.args.get("status")
    return jsonify(list_queue(status))


@api.post("/sync/queue/retry")
def sync_retry():
    return jsonify(retry_failed())
