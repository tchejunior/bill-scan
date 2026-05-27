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

    # LAB b-channel: thermal paper is warm/yellowish (high b) vs white/neutral background.
    # This gives color contrast where grayscale sees near-zero gradient.
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    b_chan = lab[:, :, 2]
    b_norm = cv2.normalize(b_chan, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    b_clahe = clahe.apply(b_norm)
    b_blurred = cv2.GaussianBlur(b_clahe, (5, 5), 0)

    # Saturation channel: thermal paper often has non-zero saturation vs white background.
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    sat_clahe = clahe.apply(sat)
    sat_blurred = cv2.GaussianBlur(sat_clahe, (5, 5), 0)

    # Strategy order: most reliable first, color-channel fallbacks for white-on-white.
    strategies = [
        cv2.Canny(blurred, 75, 200),                              # original — high contrast
        cv2.Canny(enhanced_blurred, 50, 150),                     # CLAHE grayscale — medium contrast
        cv2.Canny(b_blurred, 30, 90),                             # LAB b-channel — warm paper vs white
        cv2.Canny(sat_blurred, 20, 60),                           # saturation — paper vs white plastic
        cv2.Canny(enhanced_blurred, 30, 90),                      # CLAHE grayscale — low contrast
        cv2.Canny(cv2.bilateralFilter(gray, 9, 75, 75), 30, 90), # bilateral — edge-preserving
    ]

    for edges in strategies:
        pts = _find_quad(edges, image_area)
        if pts is not None:
            ordered = _order_points(pts)
            return [{"x": int(p[0]), "y": int(p[1])} for p in ordered]

    return None
