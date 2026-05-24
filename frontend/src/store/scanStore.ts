import { create } from 'zustand'

interface ScanState {
  capturedBlob: Blob | null
  setBlob: (blob: Blob | null) => void
  retakeExpenseId: string | null
  retakeOldReceiptId: string | null
  setRetake: (expenseId: string, oldReceiptId: string) => void
  clearRetake: () => void
}

export const useScanStore = create<ScanState>()((set) => ({
  capturedBlob: null,
  setBlob: (capturedBlob) => set({ capturedBlob }),
  retakeExpenseId: null,
  retakeOldReceiptId: null,
  setRetake: (retakeExpenseId, retakeOldReceiptId) => set({ retakeExpenseId, retakeOldReceiptId }),
  clearRetake: () => set({ retakeExpenseId: null, retakeOldReceiptId: null }),
}))
