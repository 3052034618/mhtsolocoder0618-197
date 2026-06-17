import { create } from 'zustand'
import { db } from '@/db'
import type { Customer } from '@/types'
import { nanoid } from 'nanoid'

interface CustomerStore {
  customers: Customer[]
  loading: boolean
  fetchCustomers: () => Promise<void>
  createCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  getCustomer: (id: string) => Customer | undefined
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  loading: false,

  fetchCustomers: async () => {
    set({ loading: true })
    const customers = await db.customers.orderBy('createdAt').reverse().toArray()
    set({ customers, loading: false })
  },

  createCustomer: async (data) => {
    const id = nanoid()
    const now = new Date()
    const customer: Customer = { ...data, id, createdAt: now, updatedAt: now }
    await db.customers.add(customer)
    set(state => ({ customers: [customer, ...state.customers] }))
    return id
  },

  updateCustomer: async (id, data) => {
    const updated = { ...data, updatedAt: new Date() }
    await db.customers.update(id, updated)
    set(state => ({
      customers: state.customers.map(c => c.id === id ? { ...c, ...updated } : c),
    }))
  },

  deleteCustomer: async (id) => {
    await db.customers.delete(id)
    set(state => ({ customers: state.customers.filter(c => c.id !== id) }))
  },

  getCustomer: (id) => {
    return get().customers.find(c => c.id === id)
  },
}))
