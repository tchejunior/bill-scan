import io
import pillow_heif
from PIL import Image

pillow_heif.register_heif_opener()

_MAX_SIZE = 1920
_WEBP_QUALITY = 85


def process_image(data: bytes, max_size: int = _MAX_SIZE) -> bytes:
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")
    if max(img.size) > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=_WEBP_QUALITY, method=4)
    return buf.getvalue()
