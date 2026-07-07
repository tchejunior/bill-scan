import { describe, expect, it } from 'vitest'
import {
  RECEIPT_CAMERA_VIDEO_CONSTRAINTS,
  RECEIPT_CROP_CANVAS_OPTIONS,
} from '../receiptImage'

describe('receipt image capture settings', () => {
  it('captures and crops receipts at 2560px on the long edge', () => {
    expect(RECEIPT_CAMERA_VIDEO_CONSTRAINTS).toMatchObject({
      facingMode: 'environment',
      width: { ideal: 2560 },
      height: { ideal: 1440 },
    })
    expect(RECEIPT_CROP_CANVAS_OPTIONS).toEqual({
      maxWidth: 2560,
      maxHeight: 2560,
    })
  })
})
