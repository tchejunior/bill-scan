export const RECEIPT_IMAGE_MAX_DIMENSION = 2560
export const RECEIPT_UPLOAD_MIME_TYPE = 'image/jpeg'
export const RECEIPT_UPLOAD_JPEG_QUALITY = 0.9

export const RECEIPT_CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: RECEIPT_IMAGE_MAX_DIMENSION },
  height: { ideal: 1440 },
}

export const RECEIPT_CROP_CANVAS_OPTIONS = {
  maxWidth: RECEIPT_IMAGE_MAX_DIMENSION,
  maxHeight: RECEIPT_IMAGE_MAX_DIMENSION,
} as const
