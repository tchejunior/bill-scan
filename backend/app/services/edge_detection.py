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
    enhanced = clahe.apply(gray)
    enhanced_blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    # Original approach first — keeps high-contrast detection unchanged.
    # CLAHE variants are fallbacks for low-contrast backgrounds only.
    strategies = [
        cv2.Canny(blurred, 75, 200),
        cv2.Canny(enhanced_blurred, 50, 150),
        cv2.Canny(enhanced_blurred, 30, 90),
        cv2.Canny(cv2.bilateralFilter(gray, 9, 75, 75), 30, 90),
    ]

    for edges in strategies:
        pts = _find_quad(edges, image_area)
        if pts is not None:
            ordered = _order_points(pts)
            return [{"x": int(p[0]), "y": int(p[1])} for p in ordered]

    return None
