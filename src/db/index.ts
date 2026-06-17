import Dexie, { type Table } from 'dexie'
import type { Customer, Order, OrderItem, Trip, AppSettings } from '@/types'

class DaigouDB extends Dexie {
  customers!: Table<Customer>
  orders!: Table<Order>
  orderItems!: Table<OrderItem>
  trips!: Table<Trip>
  settings!: Table<AppSettings>

  constructor() {
    super('DaigouDB')
    this.version(1).stores({
      customers: 'id, name, phone, wechat, createdAt',
      orders: 'id, customerId, tripId, status, orderDate, shareToken, createdAt',
      orderItems: 'id, orderId, createdAt',
      trips: 'id, destination, status, departureDate, createdAt',
      settings: 'id',
    })
  }
}

export const db = new DaigouDB()
