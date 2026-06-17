import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag, Wallet, TrendingUp, FileText, AlertTriangle, Clock,
  Plane, Users, Plus, Download, BarChart3, ArrowRight, BellRing,
  ChevronRight, CreditCard, Package
} from 'lucide-react'
import { addDays, differenceInDays, isPast } from 'date-fns'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useTripStore } from '@/stores/tripStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatCurrency, isThisMonth, formatDate } from '@/utils/format'
import { ORDER_STATUS_MAP } from '@/types'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const { orders, fetchOrders } = useOrderStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { trips, fetchTrips } = useTripStore()
  const { settings, fetchSettings } = useSettingsStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    (async () => {
      await Promise.all([
        fetchOrders(),
        fetchCustomers(),
        fetchTrips(),
        fetchSettings(),
      ])
      setLoaded(true)
    })()
  }, [])

  const deadlineDays = settings.paymentDeadlineDays || 7
  const customerNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    customers.forEach(c => { m[c.id] = c.name })
    return m
  }, [customers])

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

  const overdueOrders = useMemo(() => {
    return orders
      .filter(o => {
        if (o.status !== 'pending_payment') return false
        const anchor = o.purchaseDate || o.orderDate
        if (!anchor) return false
        const deadline = addDays(new Date(anchor), deadlineDays)
        return isPast(new Date(deadline))
      })
      .sort((a, b) => {
        const da = addDays(new Date(a.purchaseDate || a.orderDate), deadlineDays).getTime()
        const db = addDays(new Date(b.purchaseDate || b.orderDate), deadlineDays).getTime()
        return da - db
      })
  }, [orders, deadlineDays])

  const soonDueOrders = useMemo(() => {
    return orders
      .filter(o => {
        if (o.status !== 'pending_payment') return false
        if (overdueOrders.some(x => x.id === o.id)) return false
        const anchor = o.purchaseDate || o.orderDate
        if (!anchor) return false
        const deadline = addDays(new Date(anchor), deadlineDays)
        try {
          return differenceInDays(new Date(deadline), new Date()) <= 3 && differenceInDays(new Date(deadline), new Date()) >= 0
        } catch {
          return differenceInDays(new Date(deadline), new Date()) <= 3
        }
      })
      .sort((a, b) => {
        const da = addDays(new Date(a.purchaseDate || a.orderDate), deadlineDays).getTime()
        const db = addDays(new Date(b.purchaseDate || b.orderDate), deadlineDays).getTime()
        return da - db
      })
  }, [orders, deadlineDays, overdueOrders])

  const upcomingTripReminders = useMemo(() => {
    const items: { tripId: string; destination: string; daysLeft: number; pendingCount: number }[] = []
    for (const trip of trips) {
      if (!trip.departureDate || isPast(new Date(trip.departureDate))) continue
      if (trip.status === 'completed') continue
      const daysLeft = Math.max(0, differenceInDays(new Date(trip.departureDate), new Date()))
      const pending = orders.filter(
        o => o.tripId === trip.id && (o.status === 'pending_purchase')
      ).length
      if (pending > 0) {
        items.push({ tripId: trip.id, destination: trip.destination, daysLeft, pendingCount: pending })
      }
    }
    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3)
  }, [trips, orders])

  const customerFollowUps = useMemo(() => {
    const items: { customerId: string; name: string; daysSince: number; tags: string[] }[] = []
    for (const customer of customers) {
      if (!customer.preferenceTags?.length) continue
      const customerOrders = orders.filter(o => o.customerId === customer.id)
      if (customerOrders.length === 0) {
        items.push({ customerId: customer.id, name: customer.name, daysSince: -1, tags: customer.preferenceTags })
        continue
      }
      const lastOrder = customerOrders.reduce((a, b) =>
        new Date(a.orderDate) > new Date(b.orderDate) ? a : b
      )
      const daysSince = differenceInDays(new Date(), new Date(lastOrder.orderDate))
      if (daysSince >= 30) {
        items.push({ customerId: customer.id, name: customer.name, daysSince, tags: customer.preferenceTags })
      }
    }
    return items.sort((a, b) => b.daysSince - a.daysSince).slice(0, 5)
  }, [customers, orders])

  const overviewCards = [
    { icon: ShoppingBag, label: '待采购订单', value: String(pendingPurchaseCount), sub: '等待采购', stripColor: 'bg-navy-600', iconColor: 'text-navy-600', bgLight: 'bg-navy-50' },
    { icon: Wallet, label: '待收款金额', value: formatCurrency(pendingPaymentAmount), sub: `${orders.filter(o => o.status === 'pending_payment').length} 笔未收`, stripColor: 'bg-amber-500', iconColor: 'text-amber-500', bgLight: 'bg-amber-50' },
    { icon: TrendingUp, label: '本月营业额', value: formatCurrency(monthlyRevenue), sub: '已付款订单合计', stripColor: 'bg-emerald-600', iconColor: 'text-emerald-600', bgLight: 'bg-emerald-50' },
    { icon: FileText, label: '本月订单数', value: String(monthlyOrderCount), sub: '本月新建订单', stripColor: 'bg-indigo-600', iconColor: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  ]

  const quickActions = [
    { icon: Plus, label: '新建订单', desc: '录入买家需求', link: '/orders/new', color: 'bg-navy-600', hover: 'hover:bg-navy-500' },
    { icon: Download, label: '导出待购清单', desc: '整理采购物品', link: '/trips', color: 'bg-amber-500', hover: 'hover:bg-amber-600' },
    { icon: BarChart3, label: '月度简报', desc: '查看财务数据', link: '/finance/report', color: 'bg-emerald-600', hover: 'hover:bg-emerald-500' },
  ]

  return (
    <div className="min-h-screen bg-warm-100 p-6 space-y-6 font-body">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy-600 font-display">工作台</h1>
          <p className="text-sm text-gray-500 mt-1">今天是 {formatDate(new Date())}，早上好 ☀️</p>
        </div>
        {(overdueOrders.length > 0 || soonDueOrders.length > 0) && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm animate-pulse">
            <BellRing className="w-4 h-4" />
            <span className="font-medium">有 {overdueOrders.length + soonDueOrders.length} 笔待收款需要跟进</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {overviewCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-warm-200 flex overflow-hidden group hover:shadow-md transition-shadow">
            <div className={cn(card.stripColor, 'w-1.5 shrink-0')} />
            <div className="flex-1 p-5 relative overflow-hidden">
              <div className={cn('absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-30 group-hover:opacity-50 transition-opacity', card.bgLight)} />
              <div className="relative">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className={cn('p-1.5 rounded-lg', card.bgLight)}>
                    <card.icon className={cn('w-4 h-4', card.iconColor)} />
                  </div>
                  <span>{card.label}</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-navy-700 tabular-nums">{card.value}</div>
                <div className="mt-1 text-xs text-gray-400">{card.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {(overdueOrders.length > 0 || soonDueOrders.length > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-navy-700">待收款跟进</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    {overdueOrders.length + soonDueOrders.length} 笔
                  </span>
                </div>
                <button
                  onClick={() => navigate('/orders?status=pending_payment')}
                  className="text-sm text-navy-500 hover:text-navy-700 font-medium flex items-center gap-1 group"
                >
                  查看全部
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              <div className="divide-y divide-warm-100">
                {overdueOrders.map(o => {
                  const anchor = o.purchaseDate || o.orderDate
                  const deadline = addDays(new Date(anchor), deadlineDays)
                  const daysOverdue = Math.max(1, differenceInDays(new Date(), new Date(deadline)))
                  return (
                    <div key={o.id} className="px-5 py-4 hover:bg-red-50/40 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/orders/${o.id}`)}>
                      <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-navy-700">{customerNameMap[o.customerId] || '未命名客户'}</span>
                            <span className={cn('badge', ORDER_STATUS_MAP[o.status].color)}>
                              {ORDER_STATUS_MAP[o.status].label}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">
                              逾期 {daysOverdue} 天
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>下单 {formatDate(o.orderDate)}</span>
                            <span>应于 {formatDate(deadline)} 前付款</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-navy-700 tabular-nums">{formatCurrency(o.totalCharge)}</div>
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/orders/${o.id}`) }}
                            className="mt-2 text-sm text-navy-600 font-medium flex items-center gap-1 group-hover:text-navy-700 ml-auto"
                          >
                            去处理 <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {soonDueOrders.map(o => {
                  const anchor = o.purchaseDate || o.orderDate
                  const deadline = addDays(new Date(anchor), deadlineDays)
                  const daysLeft = Math.max(0, differenceInDays(new Date(deadline), new Date()))
                  return (
                    <div key={o.id} className="px-5 py-4 hover:bg-amber-50/40 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/orders/${o.id}`)}>
                      <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-navy-700">{customerNameMap[o.customerId] || '未命名客户'}</span>
                            <span className={cn('badge', ORDER_STATUS_MAP[o.status].color)}>
                              {ORDER_STATUS_MAP[o.status].label}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                              剩 {daysLeft} 天到期
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>下单 {formatDate(o.orderDate)}</span>
                            <span>应于 {formatDate(deadline)} 前付款</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-navy-700 tabular-nums">{formatCurrency(o.totalCharge)}</div>
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/orders/${o.id}`) }}
                            className="mt-2 text-sm text-navy-600 font-medium flex items-center gap-1 group-hover:text-navy-700 ml-auto"
                          >
                            去处理 <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {upcomingTripReminders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-200 flex items-center gap-2">
                <Plane className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-navy-700">即将出行</h2>
              </div>
              <div className="divide-y divide-warm-100">
                {upcomingTripReminders.map(t => (
                  <div key={t.tripId} className="px-5 py-4 hover:bg-amber-50/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/trips`)}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-navy-700">{t.destination}</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {t.daysLeft === 0 ? '今天出发' : `${t.daysLeft} 天后出发`} · {t.pendingCount} 件待采购
                          </div>
                        </div>
                      </div>
                      <button className="text-sm text-amber-600 font-medium flex items-center gap-1 group-hover:text-amber-700 shrink-0">
                        查看清单 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customerFollowUps.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-200 flex items-center gap-2">
                <Users className="w-5 h-5 text-navy-500" />
                <h2 className="text-lg font-semibold text-navy-700">老客户跟进</h2>
                <span className="text-xs text-gray-400">出行前主动询问</span>
              </div>
              <div className="divide-y divide-warm-100">
                {customerFollowUps.map(c => (
                  <div key={c.customerId} className="px-5 py-4 hover:bg-navy-50/40 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/customers/${c.customerId}`)}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-navy-600 text-white flex items-center justify-center font-semibold shrink-0">
                          {c.name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-navy-700">{c.name}</span>
                            {c.daysSince >= 0 && (
                              <span className="text-xs text-gray-500">{c.daysSince} 天未下单</span>
                            )}
                            {c.daysSince < 0 && (
                              <span className="text-xs text-navy-500">新客户·从未下单</span>
                            )}
                          </div>
                          {c.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1.5">
                              {c.tags.slice(0, 4).map(t => (
                                <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">{t}</span>
                              ))}
                              {c.tags.length > 4 && (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">+{c.tags.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button className="text-sm text-navy-500 font-medium flex items-center gap-1 group-hover:text-navy-700 shrink-0">
                        询问需求 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overdueOrders.length === 0 && soonDueOrders.length === 0 && upcomingTripReminders.length === 0 && customerFollowUps.length === 0 && loaded && (
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy-700">暂无待办事项</h3>
              <p className="mt-2 text-sm text-gray-500">当前没有需要跟进的订单或客户</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-5">
            <h2 className="text-lg font-semibold text-navy-700 mb-4">快捷操作</h2>
            <div className="space-y-3">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.link)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-warm-200 bg-warm-50 hover:bg-white transition-all group"
                >
                  <div className={cn('p-3 rounded-xl text-white shadow-sm transition-transform group-hover:scale-105', action.color, action.hover)}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-navy-700">{action.label}</div>
                    <div className="text-sm text-gray-500">{action.desc}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-navy-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy-700">最近订单</h2>
              <button
                onClick={() => navigate('/orders')}
                className="text-xs text-navy-500 hover:text-navy-700 font-medium"
              >
                全部 →
              </button>
            </div>
            <div className="space-y-2">
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-warm-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/orders/${o.id}`)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-navy-700 truncate">
                        {customerNameMap[o.customerId] || '未命名'}
                      </span>
                      <span className={cn('badge shrink-0', ORDER_STATUS_MAP[o.status].color)}>
                        {ORDER_STATUS_MAP[o.status].label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(o.orderDate)}</div>
                  </div>
                  {o.totalCharge > 0 && (
                    <span className="text-sm font-semibold text-navy-700 tabular-nums shrink-0">
                      {formatCurrency(o.totalCharge)}
                    </span>
                  )}
                </div>
              ))}
              {orders.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">暂无订单</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
