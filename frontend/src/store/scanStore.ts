import { create } from 'zustand'

interface ScanState {
  capturedBlob: Blob | null
  setBlob: (blob: Blob | null) => void
}

export const useScanStore = create<ScanState>()((set) => ({
  capturedBlob: null,
  setBlob: (capturedBlob) => set({ capturedBlob }),
}))
