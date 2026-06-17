import { create } from 'zustand'
import { db } from '@/db'
import type { Order, OrderItem, OrderStatus } from '@/types'
import { nanoid } from 'nanoid'

interface OrderStore {
  orders: Order[]
  orderItems: Map<string, OrderItem[]>
  loading: boolean
  fetchOrders: () => Promise<Order[]>
  fetchOrderItems: (orderId: string) => Promise<OrderItem[]>
  createOrder: (order: Omit<Order, 'id' | 'shareToken' | 'createdAt' | 'updatedAt' | 'totalCost' | 'totalCharge'>, items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt' | 'purchased'>[]) => Promise<string>
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  updateOrderItem: (id: string, data: Partial<OrderItem>) => Promise<string | null>
  updateOrderItems: (updates: { id: string; data: Partial<OrderItem> }[]) => Promise<string | null>
  addOrderItem: (orderId: string, item: Omit<OrderItem, 'id' | 'orderId' | 'createdAt' | 'purchased'>) => Promise<void>
  deleteOrderItem: (id: string) => Promise<void>
  recalcOrderTotals: (orderId: string) => Promise<void>
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  orderItems: new Map(),
  loading: false,

  fetchOrders: async () => {
    set({ loading: true })
    const orders = await db.orders.orderBy('createdAt').reverse().toArray()
    set({ orders, loading: false })
    return orders
  },

  fetchOrderItems: async (orderId: string) => {
    const items = await db.orderItems.where('orderId').equals(orderId).toArray()
    const newMap = new Map(get().orderItems)
    newMap.set(orderId, items)
    set({ orderItems: newMap })
    return items
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
    const updatedItem = await db.orderItems.get(id)
    if (!updatedItem) return null
    const orderId = updatedItem.orderId
    const freshItems = await db.orderItems.where('orderId').equals(orderId).toArray()
    const newMap = new Map(get().orderItems)
    newMap.set(orderId, freshItems)
    set({ orderItems: newMap })
    return orderId
  },

  updateOrderItems: async (updates) => {
    if (updates.length === 0) return null
    let orderId: string | null = null
    for (const u of updates) {
      await db.orderItems.update(u.id, u.data)
      if (!orderId) {
        const item = await db.orderItems.get(u.id)
        if (item) orderId = item.orderId
      }
    }
    if (orderId) {
      const freshItems = await db.orderItems.where('orderId').equals(orderId).toArray()
      const newMap = new Map(get().orderItems)
      newMap.set(orderId, freshItems)
      set({ orderItems: newMap })
    }
    return orderId
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

  recalcOrderTotals: async (orderId) => {
    const order = await db.orders.get(orderId)
    if (!order) return
    const items = await db.orderItems.where('orderId').equals(orderId).toArray()
    const totalCost = items.reduce((sum, item) => {
      const unitCost = (item.actualPrice ?? 0) + (item.taxAmount ?? 0)
      return sum + unitCost * item.quantity
    }, 0)
    const totalCharge = totalCost * order.exchangeRate * (1 + order.serviceFeeRate)
    await db.orders.update(orderId, { totalCost, totalCharge, updatedAt: new Date() })
    const updatedOrder = await db.orders.get(orderId)
    if (updatedOrder) {
      set(state => ({
        orders: state.orders.map(o => o.id === orderId ? updatedOrder : o),
      }))
    }
    const newMap = new Map(get().orderItems)
    newMap.set(orderId, items)
    set({ orderItems: newMap })
  },
}))
