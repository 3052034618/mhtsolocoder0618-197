export type OrderStatus = 'pending_purchase' | 'purchased' | 'pending_payment' | 'paid' | 'shipped' | 'completed' | 'cancelled'
export type TripStatus = 'planning' | 'in_progress' | 'completed'

export interface Customer {
  id: string
  name: string
  phone: string
  wechat: string
  address: string
  notes: string
  preferenceTags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  customerId: string
  tripId?: string
  status: OrderStatus
  orderDate: Date
  purchaseDate?: Date
  paymentDate?: Date
  shippingDate?: Date
  completedDate?: Date
  trackingNumber?: string
  shippingCompany?: string
  exchangeRate: number
  serviceFeeRate: number
  totalCost: number
  totalCharge: number
  shareToken: string
  notes: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  productLink: string
  productDesc: string
  imageUrl?: string
  quantity: number
  expectedPrice: number
  actualPrice?: number
  taxAmount?: number
  currency: string
  purchased: boolean
  createdAt: Date
}

export interface Trip {
  id: string
  destination: string
  departureDate: Date
  returnDate?: Date
  status: TripStatus
  notes: string
  createdAt: Date
  updatedAt: Date
}

export interface AppSettings {
  id: string
  defaultExchangeRate: number
  defaultServiceFeeRate: number
  sellerName: string
  sellerWechat: string
  sellerPhone: string
  paymentDeadlineDays: number
}

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending_purchase: { label: '待采购', color: 'bg-amber-100 text-amber-800' },
  purchased: { label: '已采购', color: 'bg-blue-100 text-blue-800' },
  pending_payment: { label: '待付款', color: 'bg-orange-100 text-orange-800' },
  paid: { label: '已付款', color: 'bg-emerald-100 text-emerald-800' },
  shipped: { label: '已发货', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600' },
}

export const TRIP_STATUS_MAP: Record<TripStatus, { label: string; color: string }> = {
  planning: { label: '计划中', color: 'bg-amber-100 text-amber-800' },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'id'> = {
  defaultExchangeRate: 1,
  defaultServiceFeeRate: 0.1,
  sellerName: '',
  sellerWechat: '',
  sellerPhone: '',
  paymentDeadlineDays: 7,
}
