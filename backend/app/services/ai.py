import base64
import json
import re
import anthropic
from app.config import settings

_MODEL = "claude-sonnet-4-6"
_PROMPT = (
    "Extract receipt data and return ONLY valid JSON with these exact fields:\n"
    '{"vendor": "string or null", "date": "YYYY-MM-DD or null", '
    '"total_amount": number_in_BRL_or_null, "subtotal": number_or_null, '
    '"tax_amount": number_or_null, '
    '"payment_method": "cash|credit|debit|pix|boleto|other or null", '
    '"suggested_category": "Alimentação|Transporte|Saúde|Lazer|Moradia|Educação|Outro or null", '
    '"currency": "BRL", '
    '"line_items": [{"description": "string", "quantity": number, "unit_price": number, "total": number}]}\n'
    "line_items must list every product/service line on the receipt. Use an empty array [] if none found.\n"
    "Return ONLY the JSON object. No explanation, no markdown."
)

_STRING_FIELDS = ["vendor", "date", "payment_method", "suggested_category", "currency"]
_NUMBER_FIELDS = ["total_amount", "subtotal", "tax_amount"]


def _try_partial_parse(text: str) -> dict:
    """Best-effort field extraction from malformed JSON via regex."""
    result: dict = {"_parse_error": True}
    missing: list[str] = []

    for field in _STRING_FIELDS:
        m = re.search(rf'"{field}"\s*:\s*"([^"]*)"', text)
        if m:
            result[field] = m.group(1) or None
        else:
            null_m = re.search(rf'"{field}"\s*:\s*null', text)
            result[field] = None
            if not null_m:
                missing.append(field)

    for field in _NUMBER_FIELDS:
        m = re.search(rf'"{field}"\s*:\s*([0-9]+(?:\.[0-9]+)?)', text)
        if m:
            result[field] = float(m.group(1))
        else:
            null_m = re.search(rf'"{field}"\s*:\s*null', text)
            result[field] = None
            if not null_m:
                missing.append(field)

    # Try to salvage the line_items array as a JSON substring
    li_m = re.search(r'"line_items"\s*:\s*(\[.*?\])', text, re.DOTALL)
    if li_m:
        try:
            result["line_items"] = json.loads(li_m.group(1))
        except json.JSONDecodeError:
            result["line_items"] = []
            missing.append("line_items")
    else:
        result["line_items"] = []
        missing.append("line_items")

    if missing:
        result["_missing_fields"] = missing

    return result


def extract_receipt_data(image_data: bytes) -> dict:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    image_b64 = base64.standard_b64encode(image_data).decode("utf-8")

    message = client.messages.create(
        model=_MODEL,
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/webp",
                        "data": image_b64,
                    },
                },
                {"type": "text", "text": _PROMPT},
            ],
        }],
    )

    if not message.content or not hasattr(message.content[0], "text"):
        raise ValueError("Unexpected response structure from Claude API")
    text = message.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        partial = _try_partial_parse(text)
        partial["_raw_text"] = text
        return partial
