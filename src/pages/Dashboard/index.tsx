import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Wallet, TrendingUp, FileText, AlertCircle, Plane, Users, Plus, Download, BarChart3 } from 'lucide-react'
import { isPast, differenceInDays } from 'date-fns'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useTripStore } from '@/stores/tripStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatCurrency, isThisMonth } from '@/utils/format'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const { orders, fetchOrders } = useOrderStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { trips, fetchTrips } = useTripStore()
  const { settings } = useSettingsStore()

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
    fetchTrips()
  }, [])

  const pendingPurchaseCount = useMemo(
    () => orders.filter(o => o.status === 'pending_purchase').length,
    [orders]
  )

  const pendingPaymentAmount = useMemo(
    () => orders.filter(o => o.status === 'pending_payment').reduce((sum, o) => sum + o.totalCharge, 0),
    [orders]
  )

  const monthlyRevenue = useMemo(
    () => orders.filter(o => o.paymentDate && isThisMonth(new Date(o.paymentDate))).reduce((sum, o) => sum + o.totalCharge, 0),
    [orders]
  )

  const monthlyOrderCount = useMemo(
    () => orders.filter(o => isThisMonth(new Date(o.orderDate))).length,
    [orders]
  )

  const reminders = useMemo(() => {
    const items: { icon: typeof AlertCircle; text: string; link: string; color: string }[] = []

    const overdue = orders.filter(
      o => o.status === 'pending_payment' && o.paymentDate && isPast(new Date(o.paymentDate))
    )
    if (overdue.length > 0) {
      items.push({
        icon: AlertCircle,
        text: `${overdue.length} 笔订单已逾期未收款`,
        link: '/orders?status=pending_payment',
        color: 'text-red-600',
      })
    }

    const upcomingTrips = trips.filter(
      t => t.departureDate && !isPast(new Date(t.departureDate))
    )
    for (const trip of upcomingTrips) {
      const pending = orders.filter(
        o => o.tripId === trip.id && (o.status === 'pending_purchase' || o.status === 'pending_payment')
      )
      if (pending.length > 0) {
        items.push({
          icon: Plane,
          text: `「${trip.destination}」行程有 ${pending.length} 笔待处理订单`,
          link: `/trips/${trip.id}`,
          color: 'text-amber-600',
        })
      }
    }

    for (const customer of customers) {
      if (!customer.preferenceTags?.length) continue
      const customerOrders = orders.filter(o => o.customerId === customer.id)
      if (!customerOrders.length) continue
      const lastOrder = customerOrders.reduce((a, b) =>
        new Date(a.orderDate) > new Date(b.orderDate) ? a : b
      )
      const daysSince = differenceInDays(new Date(), new Date(lastOrder.orderDate))
      if (daysSince > 30) {
        items.push({
          icon: Users,
          text: `客户「${customer.name}」已 ${daysSince} 天未下单`,
          link: `/customers/${customer.id}`,
          color: 'text-[#1e3a5f]',
        })
      }
    }

    return items.slice(0, 5)
  }, [orders, trips, customers])

  const overviewCards = [
    { icon: ShoppingBag, label: '待采购订单', value: String(pendingPurchaseCount), stripColor: 'bg-[#1e3a5f]', iconColor: 'text-[#1e3a5f]' },
    { icon: Wallet, label: '待收款金额', value: formatCurrency(pendingPaymentAmount), stripColor: 'bg-[#d4a853]', iconColor: 'text-[#d4a853]' },
    { icon: TrendingUp, label: '本月营业额', value: formatCurrency(monthlyRevenue), stripColor: 'bg-emerald-600', iconColor: 'text-emerald-600' },
    { icon: FileText, label: '本月订单数', value: String(monthlyOrderCount), stripColor: 'bg-indigo-600', iconColor: 'text-indigo-600' },
  ]

  const quickActions = [
    { icon: Plus, label: '新建订单', link: '/orders/new' },
    { icon: Download, label: '导出待购清单', link: '/trips' },
    { icon: BarChart3, label: '月度简报', link: '/finance/report' },
  ]

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-6" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
        工作台
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow flex overflow-hidden">
            <div className={cn(card.stripColor, 'w-1 shrink-0')} />
            <div className="flex-1 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <card.icon className={cn('w-4 h-4', card.iconColor)} />
                <span>{card.label}</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-[#1e3a5f]">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {reminders.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">待办提醒</h2>
          <div className="space-y-2">
            {reminders.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b last:border-b-0 border-gray-100">
                <r.icon className={cn('w-4 h-4 shrink-0', r.color)} />
                <span className={cn('flex-1 text-sm', r.color)}>{r.text}</span>
                <button
                  onClick={() => navigate(r.link)}
                  className="text-xs text-[#1e3a5f] hover:underline"
                >
                  查看
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">快捷操作</h2>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.link)}
              className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-[#1e3a5f]/10 hover:border-[#d4a853] hover:bg-[#d4a853]/5 transition-colors"
            >
              <action.icon className="w-8 h-8 text-[#1e3a5f]" />
              <span className="text-sm font-medium text-[#1e3a5f]">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
