import { useEffect, useState, useMemo } from 'react'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'
import { differenceInDays, format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Tab = 'tracking' | 'report'

export default function Finance() {
  const { orders, fetchOrders, updateOrderStatus } = useOrderStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { settings } = useSettingsStore()
  const [tab, setTab] = useState<Tab>('tracking')
  const [reportMonth, setReportMonth] = useState(new Date())

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  const customerMap = useMemo(() => {
    const map = new Map<string, string>()
    customers.forEach(c => map.set(c.id, c.name))
    return map
  }, [customers])

  const pendingPaymentOrders = useMemo(
    () => orders.filter(o => o.status === 'pending_payment'),
    [orders]
  )

  const getDaysOverdue = (orderDate: Date) => {
    const deadline = new Date(orderDate)
    deadline.setDate(deadline.getDate() + settings.paymentDeadlineDays)
    return Math.max(0, differenceInDays(new Date(), deadline))
  }

  const monthStart = startOfMonth(reportMonth)
  const monthEnd = endOfMonth(reportMonth)

  const monthlyPaidOrders = useMemo(
    () => orders.filter(o =>
      o.paymentDate && isWithinInterval(new Date(o.paymentDate), { start: monthStart, end: monthEnd })
    ),
    [orders, monthStart, monthEnd]
  )

  const monthOrderCount = orders.filter(o =>
    isWithinInterval(new Date(o.orderDate), { start: monthStart, end: monthEnd })
  ).length
  const monthRevenue = monthlyPaidOrders.reduce((s, o) => s + o.totalCharge, 0)
  const monthCost = monthlyPaidOrders.reduce((s, o) => s + o.totalCost, 0)
  const monthProfit = monthRevenue - monthCost

  const chartData = useMemo(() => {
    const data = []
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(reportMonth, i)
      const ms = startOfMonth(m)
      const me = endOfMonth(m)
      const mOrders = orders.filter(o =>
        o.paymentDate && isWithinInterval(new Date(o.paymentDate), { start: ms, end: me })
      )
      data.push({
        month: format(m, 'MM月'),
        营业额: mOrders.reduce((s, o) => s + o.totalCharge, 0),
        成本: mOrders.reduce((s, o) => s + o.totalCost, 0),
      })
    }
    return data
  }, [orders, reportMonth])

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
        财务管理
      </h1>

      <div className="flex gap-2">
        {([
          { key: 'tracking' as Tab, label: '收款追踪' },
          { key: 'report' as Tab, label: '月度简报' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              tab === t.key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white text-[#1e3a5f] border border-[#1e3a5f]/20 hover:border-[#1e3a5f]/50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tracking' ? (
        pendingPaymentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span>暂无待付款订单</span>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">客户名</th>
                  <th className="text-left px-4 py-3 font-medium">订单日期</th>
                  <th className="text-left px-4 py-3 font-medium">应收金额</th>
                  <th className="text-left px-4 py-3 font-medium">超期天数</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {pendingPaymentOrders.map(order => {
                  const overdue = getDaysOverdue(order.orderDate)
                  return (
                    <tr key={order.id} className={cn('border-b border-gray-50 hover:bg-gray-50/50', overdue > 0 && 'bg-red-50')}>
                      <td className="px-4 py-3">{customerMap.get(order.customerId) ?? '-'}</td>
                      <td className="px-4 py-3">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3 font-medium text-[#1e3a5f]">{formatCurrency(order.totalCharge)}</td>
                      <td className="px-4 py-3">
                        {overdue > 0 ? <span className="text-red-600 font-medium">{overdue}天</span> : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateOrderStatus(order.id, 'paid')}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
                          >
                            标记已付款
                          </button>
                          <button
                            onClick={() => window.alert(`已向 ${customerMap.get(order.customerId) ?? '客户'} 发送催付提醒`)}
                            className="px-3 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors"
                          >
                            催付提醒
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setReportMonth(subMonths(reportMonth, 1))}
              className="p-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
            >
              ◀
            </button>
            <span className="text-lg font-semibold text-[#1e3a5f]">{format(reportMonth, 'yyyy年MM月')}</span>
            <button
              onClick={() => setReportMonth(addMonths(reportMonth, 1))}
              className="p-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: '本月接单数', value: String(monthOrderCount), color: 'bg-[#1e3a5f]' },
              { label: '营业额', value: formatCurrency(monthRevenue), color: 'bg-[#d4a853]' },
              { label: '成本', value: formatCurrency(monthCost), color: 'bg-amber-500' },
              { label: '利润', value: formatCurrency(monthProfit), color: 'bg-emerald-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-lg shadow flex overflow-hidden">
                <div className={cn(card.color, 'w-1 shrink-0')} />
                <div className="flex-1 p-4">
                  <div className="text-sm text-gray-500">{card.label}</div>
                  <div className="mt-1 text-xl font-bold text-[#1e3a5f]">{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">近6月趋势</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="营业额" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="成本" fill="#d4a853" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
