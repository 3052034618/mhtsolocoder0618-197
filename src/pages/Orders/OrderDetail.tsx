import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Truck } from 'lucide-react'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { calculateCharge, calculateOrderCost } from '@/utils/calc'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'

const STEPS = ['待采购', '已采购', '待付款', '已付款', '已发货', '已完成']
const STEP_KEYS = ['pending_purchase', 'purchased', 'pending_payment', 'paid', 'shipped', 'completed']

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders, orderItems, fetchOrders, fetchOrderItems, updateOrderStatus, updateOrderItem, updateOrder } = useOrderStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { settings } = useSettingsStore()

  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editActualPrice, setEditActualPrice] = useState('')
  const [editTaxAmount, setEditTaxAmount] = useState('')
  const [shippingForm, setShippingForm] = useState({ trackingNumber: '', shippingCompany: '' })

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (orderId) fetchOrderItems(orderId)
  }, [orderId])

  const order = orders.find(o => o.id === orderId)
  const items = orderId ? (orderItems.get(orderId) ?? []) : []
  const customer = customers.find(c => c.id === order?.customerId)
  const currentStepIndex = order ? STEP_KEYS.indexOf(order.status) : -1

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center text-gray-400">
        订单不存在
      </div>
    )
  }

  const handleMarkPurchased = () => updateOrderStatus(order.id, 'purchased')
  const handleMarkPaid = () => updateOrderStatus(order.id, 'paid')
  const handleMarkShipped = () => {
    updateOrder(order.id, {
      trackingNumber: shippingForm.trackingNumber,
      shippingCompany: shippingForm.shippingCompany,
    })
    updateOrderStatus(order.id, 'shipped')
  }
  const handleComplete = () => updateOrderStatus(order.id, 'completed')

  const handleSaveItem = async (itemId: string) => {
    const updates: Record<string, number> = {}
    if (editActualPrice) updates.actualPrice = Number(editActualPrice)
    if (editTaxAmount) updates.taxAmount = Number(editTaxAmount)
    await updateOrderItem(itemId, updates)
    setEditingItem(null)
    if (orderId) {
      await fetchOrderItems(orderId)
      const updatedItems = orderItems.get(orderId) ?? []
      const totalCost = calculateOrderCost(updatedItems)
      const totalCharge = calculateCharge(totalCost, order.exchangeRate, order.serviceFeeRate)
      await updateOrder(order.id, { totalCost, totalCharge })
    }
  }

  const handleGenerateBill = () => {
    const totalCost = calculateOrderCost(items)
    const totalCharge = calculateCharge(totalCost, order.exchangeRate, order.serviceFeeRate)
    updateOrder(order.id, { totalCost, totalCharge })
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-1 hover:bg-gray-200 rounded">
          <ArrowLeft className="w-5 h-5 text-[#1e3a5f]" />
        </button>
        <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
          订单详情
        </h1>
      </div>

      {order.status !== 'cancelled' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                  i < currentStepIndex ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' :
                  i === currentStepIndex ? 'bg-[#d4a853] text-white border-[#d4a853]' :
                  'bg-white text-gray-400 border-gray-300'
                )}>
                  {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <h3 className="font-semibold text-[#1e3a5f]">基本信息</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-500">客户</span><span>{customer?.name ?? '-'}</span>
            <span className="text-gray-500">订单日期</span><span>{formatDate(order.orderDate)}</span>
            <span className="text-gray-500">汇率</span><span>{order.exchangeRate}</span>
            <span className="text-gray-500">服务费率</span><span>{(order.serviceFeeRate * 100).toFixed(1)}%</span>
            <span className="text-gray-500">备注</span><span>{order.notes || '-'}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <h3 className="font-semibold text-[#1e3a5f]">费用计算</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-500">总成本</span>
            <span className="font-medium">{formatCurrency(order.totalCost)}</span>
            <span className="text-gray-500">应收金额</span>
            <span className="font-bold text-[#1e3a5f]">{formatCurrency(order.totalCharge)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            应收 = 成本({formatCurrency(order.totalCost)}) × 汇率({order.exchangeRate}) × (1 + 服务费率({(order.serviceFeeRate * 100).toFixed(1)}%))
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <h3 className="font-semibold text-[#1e3a5f]">商品列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-left px-3 py-2 font-medium">商品描述</th>
                <th className="text-left px-3 py-2 font-medium">链接</th>
                <th className="text-left px-3 py-2 font-medium">数量</th>
                <th className="text-left px-3 py-2 font-medium">期望价</th>
                <th className="text-left px-3 py-2 font-medium">实际价</th>
                <th className="text-left px-3 py-2 font-medium">税费</th>
                <th className="text-left px-3 py-2 font-medium">已购</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-3 py-2 max-w-[180px] truncate">{item.productDesc}</td>
                  <td className="px-3 py-2">
                    {item.productLink ? (
                      <a href={item.productLink} target="_blank" rel="noreferrer" className="text-[#1e3a5f] hover:underline text-xs">链接</a>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{formatCurrency(item.expectedPrice, item.currency)}</td>
                  {editingItem === item.id ? (
                    <>
                      <td className="px-3 py-2">
                        <input value={editActualPrice} onChange={e => setEditActualPrice(e.target.value)}
                          type="number" className="w-20 px-1 py-0.5 border rounded text-xs" placeholder="实际价" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={editTaxAmount} onChange={e => setEditTaxAmount(e.target.value)}
                          type="number" className="w-20 px-1 py-0.5 border rounded text-xs" placeholder="税费" />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => handleSaveItem(item.id)} className="text-xs text-[#1e3a5f] hover:underline">保存</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">{item.actualPrice != null ? formatCurrency(item.actualPrice, item.currency) : '-'}</td>
                      <td className="px-3 py-2">{item.taxAmount != null ? formatCurrency(item.taxAmount, item.currency) : '-'}</td>
                      <td className="px-3 py-2">
                        {item.purchased ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-400" />}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {order.status === 'shipped' && order.trackingNumber && (
        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <h3 className="font-semibold text-[#1e3a5f]">物流信息</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-500">快递单号</span><span>{order.trackingNumber}</span>
            <span className="text-gray-500">快递公司</span><span>{order.shippingCompany ?? '-'}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {order.status === 'pending_purchase' && (
          <button onClick={handleMarkPurchased}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors text-sm">
            标记已采购
          </button>
        )}
        {order.status === 'purchased' && (
          <>
            <button onClick={() => {
              const item = items[0]
              if (item) {
                setEditingItem(item.id)
                setEditActualPrice(item.actualPrice?.toString() ?? '')
                setEditTaxAmount(item.taxAmount?.toString() ?? '')
              }
            }} className="px-4 py-2 bg-[#d4a853] text-white rounded-lg hover:bg-[#d4a853]/90 transition-colors text-sm">
              录入成本
            </button>
            <button onClick={handleGenerateBill}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors text-sm">
              生成账单
            </button>
          </>
        )}
        {order.status === 'pending_payment' && (
          <>
            <button onClick={handleMarkPaid}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors text-sm">
              标记已付款
            </button>
            <button onClick={() => alert('催付提醒已发送')}
              className="px-4 py-2 bg-[#d4a853] text-white rounded-lg hover:bg-[#d4a853]/90 transition-colors text-sm">
              催付提醒
            </button>
          </>
        )}
        {order.status === 'paid' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={shippingForm.trackingNumber} onChange={e => setShippingForm(s => ({ ...s, trackingNumber: e.target.value }))}
                placeholder="快递单号" className="px-3 py-2 border rounded-lg text-sm flex-1" />
              <input value={shippingForm.shippingCompany} onChange={e => setShippingForm(s => ({ ...s, shippingCompany: e.target.value }))}
                placeholder="快递公司" className="px-3 py-2 border rounded-lg text-sm flex-1" />
              <button onClick={handleMarkShipped}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors text-sm whitespace-nowrap">
                录入物流
              </button>
            </div>
          </div>
        )}
        {order.status === 'shipped' && (
          <button onClick={handleComplete}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
            完成订单
          </button>
        )}
      </div>
    </div>
  )
}
