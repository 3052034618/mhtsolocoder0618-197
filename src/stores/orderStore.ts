import { create } from 'zustand'
import { db } from '@/db'
import type { Order, OrderItem, OrderStatus } from '@/types'
import { nanoid } from 'nanoid'

interface OrderStore {
  orders: Order[]
  orderItems: Map<string, OrderItem[]>
  loading: boolean
  fetchOrders: () => Promise<void>
  fetchOrderItems: (orderId: string) => Promise<void>
  createOrder: (order: Omit<Order, 'id' | 'shareToken' | 'createdAt' | 'updatedAt' | 'totalCost' | 'totalCharge'>, items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt' | 'purchased'>[]) => Promise<string>
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  updateOrderItem: (id: string, data: Partial<OrderItem>) => Promise<void>
  addOrderItem: (orderId: string, item: Omit<OrderItem, 'id' | 'orderId' | 'createdAt' | 'purchased'>) => Promise<void>
  deleteOrderItem: (id: string) => Promise<void>
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  orderItems: new Map(),
  loading: false,

  fetchOrders: async () => {
    set({ loading: true })
    const orders = await db.orders.orderBy('createdAt').reverse().toArray()
    set({ orders, loading: false })
  },

  fetchOrderItems: async (orderId: string) => {
    const items = await db.orderItems.where('orderId').equals(orderId).toArray()
    const newMap = new Map(get().orderItems)
    newMap.set(orderId, items)
    set({ orderItems: newMap })
  },

  createOrder: async (orderData, itemsData) => {
    const id = nanoid()
    const now = new Date()
    const shareToken = nanoid(12)

    const order: Order = {
      ...orderData,
      id,
      shareToken,
      totalCost: 0,
      totalCharge: 0,
      createdAt: now,
      updatedAt: now,
    }

    const items: OrderItem[] = itemsData.map(item => ({
      ...item,
      id: nanoid(),
      orderId: id,
      purchased: false,
      createdAt: now,
    }))

    await db.orders.add(order)
    await db.orderItems.bulkAdd(items)

    set(state => ({
      orders: [order, ...state.orders],
      orderItems: new Map(state.orderItems).set(id, items),
    }))

    return id
  },

  updateOrder: async (id, data) => {
    const updated = { ...data, updatedAt: new Date() }
    await db.orders.update(id, updated)
    set(state => ({
      orders: state.orders.map(o => o.id === id ? { ...o, ...updated } : o),
    }))
  },

  updateOrderStatus: async (id, status) => {
    const now = new Date()
    const statusFields: Partial<Order> = {}
    if (status === 'purchased') statusFields.purchaseDate = now
    if (status === 'paid') statusFields.paymentDate = now
    if (status === 'shipped') statusFields.shippingDate = now
    if (status === 'completed') statusFields.completedDate = now

    await db.orders.update(id, { status, ...statusFields, updatedAt: now })
    set(state => ({
      orders: state.orders.map(o => o.id === id ? { ...o, status, ...statusFields, updatedAt: now } : o),
    }))
  },

  deleteOrder: async (id) => {
    await db.orders.delete(id)
    await db.orderItems.where('orderId').equals(id).delete()
    set(state => {
      const newMap = new Map(state.orderItems)
      newMap.delete(id)
      return {
        orders: state.orders.filter(o => o.id !== id),
        orderItems: newMap,
      }
    })
  },

  updateOrderItem: async (id, data) => {
    await db.orderItems.update(id, data)
    const items = await db.orderItems.toArray()
    const orderId = items.find(i => i.id === id)?.orderId
    if (orderId) {
      const orderItems = items.filter(i => i.orderId === orderId)
      const newMap = new Map(get().orderItems)
      newMap.set(orderId, orderItems)
      set({ orderItems: newMap })
    }
  },

  addOrderItem: async (orderId, itemData) => {
    const item: OrderItem = {
      ...itemData,
      id: nanoid(),
      orderId,
      purchased: false,
      createdAt: new Date(),
    }
    await db.orderItems.add(item)
    const items = await db.orderItems.where('orderId').equals(orderId).toArray()
    const newMap = new Map(get().orderItems)
    newMap.set(orderId, items)
    set({ orderItems: newMap })
  },

  deleteOrderItem: async (id) => {
    const item = await db.orderItems.get(id)
    if (!item) return
    await db.orderItems.delete(id)
    const items = await db.orderItems.where('orderId').equals(item.orderId).toArray()
    const newMap = new Map(get().orderItems)
    newMap.set(item.orderId, items)
    set({ orderItems: newMap })
  },
}))
