import { create } from 'zustand'
import { db } from '@/db'
import type { Trip } from '@/types'
import { nanoid } from 'nanoid'

interface TripStore {
  trips: Trip[]
  loading: boolean
  fetchTrips: () => Promise<void>
  createTrip: (data: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateTrip: (id: string, data: Partial<Trip>) => Promise<void>
  deleteTrip: (id: string) => Promise<void>
}

export const useTripStore = create<TripStore>((set) => ({
  trips: [],
  loading: false,

  fetchTrips: async () => {
    set({ loading: true })
    const trips = await db.trips.orderBy('departureDate').reverse().toArray()
    set({ trips, loading: false })
  },

  createTrip: async (data) => {
    const id = nanoid()
    const now = new Date()
    const trip: Trip = { ...data, id, createdAt: now, updatedAt: now }
    await db.trips.add(trip)
    set(state => ({ trips: [trip, ...state.trips] }))
    return id
  },

  updateTrip: async (id, data) => {
    const updated = { ...data, updatedAt: new Date() }
    await db.trips.update(id, updated)
    set(state => ({
      trips: state.trips.map(t => t.id === id ? { ...t, ...updated } : t),
    }))
  },

  deleteTrip: async (id) => {
    await db.trips.delete(id)
    set(state => ({ trips: state.trips.filter(t => t.id !== id) }))
  },
}))
