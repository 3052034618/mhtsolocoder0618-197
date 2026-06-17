import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Crown, Check, Truck, Package } from 'lucide-react'
import { db } from '@/db'
import { formatCurrency, formatDate } from '@/utils/format'
import { ORDER_STATUS_MAP } from '@/types'
import type { Order, OrderItem, Customer, AppSettings } from '@/types'
import { cn } from '@/lib/utils'

const STEPS = ['待采购', '已采购', '待付款', '已付款', '已发货', '已完成']
const STEP_KEYS = ['pending_purchase', 'purchased', 'pending_payment', 'paid', 'shipped', 'completed']

export default function Track() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [sellerName, setSellerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shareToken) return
    ;(async () => {
      const o = await db.orders.where('shareToken').equals(shareToken).first()
      if (!o) { setLoading(false); return }
      setOrder(o)
      const [oi, c, s] = await Promise.all([
        db.orderItems.where('orderId').equals(o.id).toArray(),
        db.customers.get(o.customerId),
        db.settings.get('app'),
      ])
      setItems(oi)
      setCustomer(c ?? null)
      setSellerName(s?.sellerName ?? '')
      setLoading(false)
    })()
  }, [shareToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
        <Package className="w-8 h-8 text-[#d4a853] animate-pulse" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center text-gray-400" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
        订单不存在
      </div>
    )
  }

  const currentStepIndex = STEP_KEYS.indexOf(order.status)

  return (
    <div className="min-h-screen bg-[#f5f3ef] py-8 px-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <Crown className="w-8 h-8 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
            代购订单追踪
          </h1>
        </div>

        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, i) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                    i < currentStepIndex ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' :
                    i === currentStepIndex ? 'bg-[#d4a853] text-white border-[#d4a853]' :
                    'bg-white text-gray-400 border-gray-300'
                  )}>
                    {i < currentStepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    'text-xs mt-1',
                    i <= currentStepIndex ? 'text-[#1e3a5f] font-medium' : 'text-gray-400'
                  )}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="font-semibold text-[#1e3a5f]">订单信息</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-500">客户</span><span>{customer?.name ?? '-'}</span>
            <span className="text-gray-500">订单日期</span><span>{formatDate(order.orderDate)}</span>
            <span className="text-gray-500">汇率</span><span>{order.exchangeRate}</span>
            <span className="text-gray-500">状态</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium inline-block w-fit', ORDER_STATUS_MAP[order.status]?.color)}>
              {ORDER_STATUS_MAP[order.status]?.label ?? '-'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="font-semibold text-[#1e3a5f]">商品列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left px-3 py-2 font-medium">商品描述</th>
                  <th className="text-left px-3 py-2 font-medium">数量</th>
                  <th className="text-left px-3 py-2 font-medium">期望价</th>
                  <th className="text-left px-3 py-2 font-medium">已购</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="px-3 py-2 max-w-[200px] truncate">{item.productDesc}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatCurrency(item.expectedPrice, item.currency)}</td>
                    <td className="px-3 py-2">
                      {item.purchased ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-2 border-t text-sm">
            <span className="text-gray-500">账单金额</span>
            <span className="font-bold text-[#1e3a5f] text-lg">{formatCurrency(order.totalCharge)}</span>
          </div>
        </div>

        {order.status === 'shipped' && order.trackingNumber && (
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
              <Truck className="w-4 h-4" />物流信息
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-500">快递单号</span><span>{order.trackingNumber}</span>
              <span className="text-gray-500">快递公司</span><span>{order.shippingCompany ?? '-'}</span>
            </div>
          </div>
        )}

        {sellerName && (
          <p className="text-center text-xs text-gray-400 pt-2">
            由 {sellerName} 提供
          </p>
        )}
      </div>
    </div>
  )
}
