import { create } from 'zustand'

type AuthFlowState = {
  pendingEmail: string | null
  setPendingEmail: (email: string | null) => void
}

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
  pendingEmail: null,
  setPendingEmail: (pendingEmail) => set({ pendingEmail }),
}))
