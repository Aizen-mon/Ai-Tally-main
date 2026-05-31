from typing import Dict, Optional

from config import STT_MODEL

try:
    from faster_whisper import WhisperModel
except Exception:
    WhisperModel = None


class STTService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or STT_MODEL
        self._model = None

    def available_models(self):
        return ["tiny", "base", "small", "medium", "large-v3"]

    def _ensure_model(self):
        if WhisperModel is None:
            return None
        if self._model is None:
            self._model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
        return self._model

    def transcribe(self, audio_path: str) -> Dict[str, str]:
        model = self._ensure_model()
        if model is None:
            return {"text": "", "error": "faster-whisper is not installed"}
        segments, info = model.transcribe(audio_path)
        text = "".join(segment.text for segment in segments).strip()
        return {"text": text, "language": info.language}
