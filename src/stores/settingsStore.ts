import { create } from 'zustand'
import { db } from '@/db'
import type { AppSettings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

interface SettingsStore {
  settings: AppSettings
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<AppSettings>) => Promise<void>
}

const defaultSettings: AppSettings = { id: 'app', ...DEFAULT_SETTINGS }

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    const existing = await db.settings.get('app')
    if (existing) {
      set({ settings: existing, loading: false })
    } else {
      await db.settings.add(defaultSettings)
      set({ settings: defaultSettings, loading: false })
    }
  },

  updateSettings: async (data) => {
    const updated = { ...data, id: 'app' } as AppSettings
    await db.settings.update('app', updated)
    set(state => ({ settings: { ...state.settings, ...updated } }))
  },
}))
