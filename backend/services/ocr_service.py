import re
from typing import Dict, Any, List

try:
    from PIL import Image
    import pytesseract
except Exception:
    Image = None
    pytesseract = None


LINE_ITEM_RE = re.compile(
    r"(?P<name>[A-Za-z0-9 \-()/.]+?)\s+x\s+(?P<qty>[0-9]+(?:\.[0-9]+)?)\s*@?\s*(?P<price>[0-9][0-9,]*\.?[0-9]*)",
    re.IGNORECASE,
)


def _extract_items(text: str) -> List[Dict[str, Any]]:
    items = []
    for line in text.splitlines():
        match = LINE_ITEM_RE.search(line)
        if not match:
            continue
        name = match.group("name").strip(" .,-")
        qty = float(match.group("qty"))
        price = float(match.group("price").replace(",", ""))
        items.append({"description": name, "qty": qty, "price": price})
    return items


def process_ocr(file_path: str) -> Dict[str, Any]:
    if Image is None or pytesseract is None:
        return {"text": "", "lines": [], "error": "pytesseract is not installed"}

    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image) or ""
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        items = _extract_items(text)
        return {"text": text.strip(), "lines": lines, "items": items}
    except Exception as exc:
        return {"text": "", "lines": [], "error": str(exc)}
