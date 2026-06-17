import { useEffect, useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useTripStore } from '@/stores/tripStore'
import { useOrderStore } from '@/stores/orderStore'
import { TRIP_STATUS_MAP } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'

interface PendingItem {
  itemId: string
  productDesc: string
  quantity: number
  expectedPrice: number
  purchased: boolean
}

export default function Trips() {
  const { trips, fetchTrips, createTrip, updateTrip } = useTripStore()
  const { orders, orderItems, fetchOrders, fetchOrderItems, updateOrderItem } = useOrderStore()
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ destination: '', departureDate: '', returnDate: '', notes: '' })

  useEffect(() => {
    fetchTrips()
    fetchOrders()
  }, [])

  useEffect(() => {
    orders.forEach(o => {
      if (!orderItems.has(o.id)) fetchOrderItems(o.id)
    })
  }, [orders.length])

  const tripOrderCounts = useMemo(() => {
    const map = new Map<string, number>()
    trips.forEach(t => {
      map.set(t.id, orders.filter(o => o.tripId === t.id).length)
    })
    return map
  }, [trips, orders])

  const handleCreate = async () => {
    if (!form.destination || !form.departureDate) return
    await createTrip({
      destination: form.destination,
      departureDate: new Date(form.departureDate),
      returnDate: form.returnDate ? new Date(form.returnDate) : undefined,
      status: 'planning',
      notes: form.notes,
    })
    setShowModal(false)
    setForm({ destination: '', departureDate: '', returnDate: '', notes: '' })
  }

  const getPendingItems = (tripId: string): PendingItem[] => {
    const tripOrders = orders.filter(o => o.tripId === tripId && o.status === 'pending_purchase')
    const items: PendingItem[] = []
    tripOrders.forEach(o => {
      (orderItems.get(o.id) ?? []).forEach(item => {
        items.push({
          itemId: item.id,
          productDesc: item.productDesc,
          quantity: item.quantity,
          expectedPrice: item.expectedPrice,
          purchased: item.purchased,
        })
      })
    })
    return items
  }

  const handleExport = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId)
    const items = getPendingItems(tripId)
    const lines = items.map((item, i) =>
      `${i + 1}. ${item.productDesc} x${item.quantity} 预计 ${formatCurrency(item.expectedPrice)}`
    )
    const text = `出行: ${trip?.destination}\n日期: ${formatDate(trip?.departureDate)}\n\n待购清单:\n${lines.join('\n')}`
    navigator.clipboard.writeText(text)
    window.alert('清单已复制到剪贴板')
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
          出行计划
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建出行
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-[#1e3a5f]">新建出行</h2>
            <input
              placeholder="目的地"
              value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/50"
            />
            <div>
              <label className="block text-sm text-gray-500 mb-1">出发日期</label>
              <input
                type="date"
                value={form.departureDate}
                onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">返回日期</label>
              <input
                type="date"
                value={form.returnDate}
                onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/50"
              />
            </div>
            <textarea
              placeholder="备注"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {trips.map(trip => {
          const statusInfo = TRIP_STATUS_MAP[trip.status]
          const orderCount = tripOrderCounts.get(trip.id) ?? 0
          const isExpanded = expandedId === trip.id
          const pendingItems = isExpanded ? getPendingItems(trip.id) : []

          return (
            <div key={trip.id} className="bg-white rounded-lg shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1e3a5f]">{trip.destination}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(trip.departureDate)}
                    {trip.returnDate ? ` ~ ${formatDate(trip.returnDate)}` : ''}
                    {orderCount > 0 && ` · ${orderCount} 笔订单`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {trip.status === 'planning' && (
                    <button
                      onClick={() => updateTrip(trip.id, { status: 'in_progress' })}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      开始出行
                    </button>
                  )}
                  {trip.status === 'in_progress' && (
                    <button
                      onClick={() => updateTrip(trip.id, { status: 'completed' })}
                      className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
                    >
                      完成出行
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : trip.id)}
                  className="px-3 py-1 text-xs rounded border border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                >
                  {isExpanded ? '收起清单' : '查看待购清单'}
                </button>
                {isExpanded && pendingItems.length > 0 && (
                  <button
                    onClick={() => handleExport(trip.id)}
                    className="px-3 py-1 text-xs rounded border border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                  >
                    导出清单
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {pendingItems.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无待购商品</p>
                  ) : (
                    pendingItems.map(item => (
                      <div key={item.itemId} className="flex items-center gap-3 py-1">
                        <input
                          type="checkbox"
                          checked={item.purchased}
                          onChange={() => updateOrderItem(item.itemId, { purchased: !item.purchased })}
                          className="w-4 h-4 accent-[#1e3a5f]"
                        />
                        <span className={cn('flex-1 text-sm', item.purchased && 'line-through text-gray-400')}>
                          {item.productDesc}
                        </span>
                        <span className="text-sm text-gray-500">x{item.quantity}</span>
                        <span className="text-sm text-[#1e3a5f]">{formatCurrency(item.expectedPrice)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}

        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span>暂无出行计划</span>
          </div>
        )}
      </div>
    </div>
  )
}
