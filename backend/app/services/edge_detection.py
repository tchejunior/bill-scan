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


def _find_quad(edges: np.ndarray, image_area: int) -> np.ndarray | None:
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.dilate(edges, kernel, iterations=2)
    closed = cv2.morphologyEx(closed, cv2.MORPH_CLOSE, kernel, iterations=3)

    contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
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

    # Downscale for processing — full resolution is unnecessary for quad detection
    max_dim = 1024
    scale = min(max_dim / w, max_dim / h, 1.0)
    proc = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA) if scale < 1.0 else img
    ph, pw = proc.shape[:2]
    image_area = ph * pw

    gray = cv2.cvtColor(proc, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Each strategy is tried in order; first one that finds a quad wins.
    # Low-contrast images need CLAHE + low Canny thresholds.
    # High-contrast images are caught by any strategy, including the last fallback.
    strategies = [
        lambda g, e: cv2.Canny(cv2.GaussianBlur(e, (5, 5), 0), 20, 60),   # CLAHE + very low
        lambda g, e: cv2.Canny(cv2.GaussianBlur(e, (5, 5), 0), 30, 90),   # CLAHE + low
        lambda g, e: cv2.Canny(cv2.bilateralFilter(g, 9, 75, 75), 25, 75), # bilateral + low
        lambda g, e: cv2.Canny(cv2.GaussianBlur(e, (5, 5), 0), 50, 150),  # CLAHE + medium
        lambda g, e: cv2.Canny(cv2.GaussianBlur(g, (5, 5), 0), 75, 200),  # original fallback
    ]

    for strategy in strategies:
        edges = strategy(gray, enhanced)
        pts = _find_quad(edges, image_area)
        if pts is not None:
            ordered = _order_points(pts)
            inv = 1.0 / scale
            return [{"x": int(p[0] * inv), "y": int(p[1] * inv)} for p in ordered]

    return None
