import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Package, Eye } from 'lucide-react'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { ORDER_STATUS_MAP, type OrderStatus } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'

const STATUS_TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_purchase', label: '待采购' },
  { key: 'purchased', label: '已采购' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'paid', label: '已付款' },
  { key: 'shipped', label: '已发货' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

export default function Orders() {
  const navigate = useNavigate()
  const { orders, orderItems, fetchOrders, fetchOrderItems } = useOrderStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  useEffect(() => {
    orders.forEach(o => {
      if (!orderItems.has(o.id)) fetchOrderItems(o.id)
    })
  }, [orders.length])

  const customerMap = useMemo(() => {
    const map = new Map<string, string>()
    customers.forEach(c => map.set(c.id, c.name))
    return map
  }, [customers])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (search) {
        const name = customerMap.get(o.customerId) ?? ''
        const items = orderItems.get(o.id) ?? []
        const desc = items.map(i => i.productDesc).join(' ')
        const q = search.toLowerCase()
        if (!name.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [orders, statusFilter, search, customerMap, orderItems])

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
          订单管理
        </h1>
        <button
          onClick={() => navigate('/orders/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建订单
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors border',
              statusFilter === tab.key
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-[#1e3a5f] border-[#1e3a5f]/20 hover:border-[#1e3a5f]/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索客户名或商品描述..."
          className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-[#1e3a5f]/50 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Package className="w-12 h-12 mb-3" />
          <span>暂无订单</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">订单日期</th>
                <th className="text-left px-4 py-3 font-medium">客户</th>
                <th className="text-left px-4 py-3 font-medium">商品摘要</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">应收金额</th>
                <th className="text-left px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const items = orderItems.get(order.id) ?? []
                const summary = items.length > 0
                  ? items[0].productDesc + (items.length > 1 ? `等${items.length}件` : '')
                  : '-'
                const statusInfo = ORDER_STATUS_MAP[order.status]
                return (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">{formatDate(order.orderDate)}</td>
                    <td className="px-4 py-3">{customerMap.get(order.customerId) ?? '-'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{summary}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1e3a5f]">{formatCurrency(order.totalCharge)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="flex items-center gap-1 text-[#1e3a5f] hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        查看
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
