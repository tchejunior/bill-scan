import cv2
import numpy as np


def _order_points(pts: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left
    rect[2] = pts[np.argmax(s)]   # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect


def _find_quad_from_edges(edges: np.ndarray, image_area: int) -> np.ndarray | None:
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)
    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    for contour in contours[:15]:
        area = cv2.contourArea(contour)
        if area < image_area * 0.08 or area > image_area * 0.99:
            continue
        peri = cv2.arcLength(contour, True)
        for eps in (0.02, 0.03, 0.04):
            approx = cv2.approxPolyDP(contour, eps * peri, True)
            if len(approx) == 4:
                return approx.reshape(4, 2)
    return None


def _find_quad_from_texture(gray: np.ndarray, image_area: int) -> np.ndarray | None:
    """
    Receipts have dense text → high local variance. Backgrounds (plastic, walls,
    fabric) are smoother. Find the largest high-variance blob and fit a rotated
    bounding rectangle — handles tilted receipts automatically via minAreaRect.
    """
    ksize = 25
    gf = gray.astype(np.float32)
    mean = cv2.blur(gf, (ksize, ksize))
    mean_sq = cv2.blur(gf ** 2, (ksize, ksize))
    std = np.sqrt(np.clip(mean_sq - mean ** 2, 0, None))
    texture = cv2.normalize(std, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Otsu picks the high/low texture threshold automatically
    _, mask = cv2.threshold(texture, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Close gaps inside the receipt (text gaps), then remove small specks
    close_k = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, close_k, iterations=3)
    open_k = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, open_k, iterations=1)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    if area < image_area * 0.05 or area > image_area * 0.95:
        return None

    # Prefer a clean quad from the convex hull
    hull = cv2.convexHull(largest)
    peri = cv2.arcLength(hull, True)
    for eps in (0.02, 0.04, 0.06, 0.08, 0.10):
        approx = cv2.approxPolyDP(hull, eps * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)

    # Fall back to minimum-area rotated rect — always returns exactly 4 points
    return cv2.boxPoints(cv2.minAreaRect(largest))


def detect_document_corners(image_bytes: bytes) -> list[dict] | None:
    """
    Detect the four corners of a document in the image.
    Returns [{"x": int, "y": int}, ...] ordered top-left → top-right →
    bottom-right → bottom-left, in original image pixel coordinates.
    Returns None if no clear quadrilateral is found.
    """
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return None

    h, w = img.shape[:2]
    image_area = h * w

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_blurred = cv2.GaussianBlur(clahe.apply(gray), (5, 5), 0)

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    b_norm = cv2.normalize(lab[:, :, 2], None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    b_blurred = cv2.GaussianBlur(clahe.apply(b_norm), (5, 5), 0)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat_blurred = cv2.GaussianBlur(clahe.apply(hsv[:, :, 1]), (5, 5), 0)

    # ── Pass 1: gradient-based (fast, high-contrast images) ───────────────────
    for edges in [
        cv2.Canny(blurred, 75, 200),
        cv2.Canny(enhanced_blurred, 50, 150),
        cv2.Canny(b_blurred, 30, 90),
        cv2.Canny(sat_blurred, 20, 60),
        cv2.Canny(enhanced_blurred, 30, 90),
        cv2.Canny(cv2.bilateralFilter(gray, 9, 75, 75), 30, 90),
    ]:
        pts = _find_quad_from_edges(edges, image_area)
        if pts is not None:
            return [{"x": int(p[0]), "y": int(p[1])} for p in _order_points(pts)]

    # ── Pass 2: texture-based (low-contrast / white-on-white) ─────────────────
    pts = _find_quad_from_texture(gray, image_area)
    if pts is not None:
        return [{"x": int(p[0]), "y": int(p[1])} for p in _order_points(pts)]

    return None
