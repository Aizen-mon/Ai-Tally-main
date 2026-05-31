from typing import Dict, Any


def process_ocr(text: str) -> Dict[str, Any]:
    return {"text": text or "", "lines": []}
