import { create } from 'zustand'

export type LayoutPref = 'list' | 'table' | 'grid'

const STORAGE_KEY = 'recibo42-layout'

function loadInitial(): LayoutPref {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'table' || stored === 'grid' ? stored : 'list'
}

interface LayoutState {
  layout: LayoutPref
  setLayout: (layout: LayoutPref) => void
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  layout: loadInitial(),
  setLayout: (layout) => {
    localStorage.setItem(STORAGE_KEY, layout)
    set({ layout })
  },
}))
