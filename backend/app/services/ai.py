import base64
import json
import anthropic
from app.config import settings

_MODEL = "claude-sonnet-4-6"
_PROMPT = (
    "Extract receipt data and return ONLY valid JSON with these exact fields:\n"
    '{"vendor": "string or null", "date": "YYYY-MM-DD or null", '
    '"total_amount": number_or_null, "subtotal": number_or_null, '
    '"tax_amount": number_or_null, '
    '"payment_method": "cash|credit|debit|pix|boleto|other or null", '
    '"suggested_category": "Alimentação|Transporte|Saúde|Moradia|Lazer|'
    'Compras|Educação|Serviços/Utilidades|Viagem|Outros or null", '
    '"currency": "BRL", "line_items": []}\n'
    "Return ONLY the JSON object. No explanation, no markdown."
)


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

    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()

    return json.loads(text)
