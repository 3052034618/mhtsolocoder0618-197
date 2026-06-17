import { useEffect, useState, useMemo } from 'react'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const PIE_COLORS = ['#1e3a5f', '#d4a853']

export default function Report() {
  const { orders, fetchOrders } = useOrderStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  const customerMap = useMemo(() => {
    const map = new Map<string, string>()
    customers.forEach(c => map.set(c.id, c.name))
    return map
  }, [customers])

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const monthlyOrders = useMemo(
    () => orders.filter(o =>
      o.paymentDate &&
      isWithinInterval(new Date(o.paymentDate), { start: monthStart, end: monthEnd }) &&
      ['paid', 'completed', 'shipped'].includes(o.status)
    ),
    [orders, monthStart, monthEnd]
  )

  const monthOrderCount = orders.filter(o =>
    isWithinInterval(new Date(o.orderDate), { start: monthStart, end: monthEnd })
  ).length
  const monthRevenue = monthlyOrders.reduce((s, o) => s + o.totalCharge, 0)
  const monthCost = monthlyOrders.reduce((s, o) => s + o.totalCost, 0)
  const monthProfit = monthRevenue - monthCost

  const pieData = [
    { name: '成本', value: monthCost },
    { name: '利润', value: Math.max(0, monthProfit) },
  ]

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4 print-report" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="flex items-center justify-between print-hide">
        <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
          月度财务简报
        </h1>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 text-sm transition-colors"
        >
          打印
        </button>
      </div>

      <div className="flex items-center gap-4 print-hide">
        <button
          onClick={() => setMonth(subMonths(month, 1))}
          className="p-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
        >
          ◀
        </button>
        <span className="text-lg font-semibold text-[#1e3a5f]">{format(month, 'yyyy年MM月')}</span>
        <button
          onClick={() => setMonth(addMonths(month, 1))}
          className="p-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '接单数', value: String(monthOrderCount), color: 'bg-[#1e3a5f]' },
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
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">成本 vs 利润</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">日期</th>
              <th className="text-left px-4 py-3 font-medium">客户</th>
              <th className="text-left px-4 py-3 font-medium">应收</th>
              <th className="text-left px-4 py-3 font-medium">成本</th>
              <th className="text-left px-4 py-3 font-medium">利润</th>
            </tr>
          </thead>
          <tbody>
            {monthlyOrders.map(o => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">{formatDate(o.paymentDate)}</td>
                <td className="px-4 py-3">{customerMap.get(o.customerId) ?? '-'}</td>
                <td className="px-4 py-3">{formatCurrency(o.totalCharge)}</td>
                <td className="px-4 py-3">{formatCurrency(o.totalCost)}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(o.totalCharge - o.totalCost)}</td>
              </tr>
            ))}
            {monthlyOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">该月暂无已付款订单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`@media print { .print-hide { display: none !important; } .print-report { background: white; padding: 0; } }`}</style>
    </div>
  )
}
