from typing import Dict, Any

try:
    from PIL import Image
    import pytesseract
except Exception:
    Image = None
    pytesseract = None


def process_ocr(file_path: str) -> Dict[str, Any]:
    if Image is None or pytesseract is None:
        return {"text": "", "lines": [], "error": "pytesseract is not installed"}

    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image) or ""
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return {"text": text.strip(), "lines": lines}
    except Exception as exc:
        return {"text": "", "lines": [], "error": str(exc)}
