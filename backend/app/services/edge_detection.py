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

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 75, 200)
    # Dilate slightly to close gaps in edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    image_area = h * w
    for contour in contours[:10]:
        area = cv2.contourArea(contour)
        # Skip contours that are too small (< 10% of image) or too large (> 99%)
        if area < image_area * 0.10 or area > image_area * 0.99:
            continue
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4:
            pts = approx.reshape(4, 2)
            ordered = _order_points(pts)
            return [{"x": int(p[0]), "y": int(p[1])} for p in ordered]

    return None
