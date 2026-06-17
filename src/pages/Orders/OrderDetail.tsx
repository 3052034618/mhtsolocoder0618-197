import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Truck, Edit3, Save, XCircle } from 'lucide-react'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { calculateCharge, calculateOrderCost } from '@/utils/calc'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'

const STEPS = ['待采购', '已采购', '待付款', '已付款', '已发货', '已完成']
const STEP_KEYS = ['pending_purchase', 'purchased', 'pending_payment', 'paid', 'shipped', 'completed']

interface EditRow {
  actualPrice: string
  taxAmount: string
}

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders, orderItems, fetchOrders, fetchOrderItems, updateOrderStatus, updateOrderItem, updateOrder } = useOrderStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { settings } = useSettingsStore()

  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [editRows, setEditRows] = useState<Record<string, EditRow>>({})
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [singleEdit, setSingleEdit] = useState<EditRow>({ actualPrice: '', taxAmount: '' })
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

  const previewTotalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      const row = bulkEditMode ? editRows[item.id] : null
      const ap = row && row.actualPrice !== '' ? Number(row.actualPrice) : (item.actualPrice ?? 0)
      const ta = row && row.taxAmount !== '' ? Number(row.taxAmount) : (item.taxAmount ?? 0)
      return sum + (ap + ta) * item.quantity
    }, 0)
  }, [items, bulkEditMode, editRows])

  const previewTotalCharge = useMemo(() => {
    if (!order) return 0
    return calculateCharge(previewTotalCost, order.exchangeRate, order.serviceFeeRate)
  }, [previewTotalCost, order])

  const enterBulkEdit = () => {
    const rows: Record<string, EditRow> = {}
    items.forEach(item => {
      rows[item.id] = {
        actualPrice: item.actualPrice != null ? String(item.actualPrice) : '',
        taxAmount: item.taxAmount != null ? String(item.taxAmount) : '',
      }
    })
    setEditRows(rows)
    setBulkEditMode(true)
  }

  const exitBulkEdit = () => {
    setBulkEditMode(false)
    setEditRows({})
  }

  const updateEditRow = (itemId: string, field: keyof EditRow, value: string) => {
    setEditRows(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }))
  }

  const saveBulkEdit = async () => {
    if (!orderId) return
    for (const item of items) {
      const row = editRows[item.id]
      if (!row) continue
      const updates: Record<string, number | boolean> = {}
      if (row.actualPrice !== '') updates.actualPrice = Number(row.actualPrice)
      if (row.taxAmount !== '') updates.taxAmount = Number(row.taxAmount)
      const ap = row.actualPrice !== '' ? Number(row.actualPrice) : null
      if (ap != null && ap > 0) updates.purchased = true
      await updateOrderItem(item.id, updates)
    }
    await fetchOrderItems(orderId)
    const updatedItems = orderItems.get(orderId) ?? items
    const cost = calculateOrderCost(updatedItems)
    const charge = calculateCharge(cost, order!.exchangeRate, order!.serviceFeeRate)
    await updateOrder(order!.id, { totalCost: cost, totalCharge: charge })
    setBulkEditMode(false)
    setEditRows({})
  }

  const startSingleEdit = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    setEditingItemId(itemId)
    setSingleEdit({
      actualPrice: item.actualPrice != null ? String(item.actualPrice) : '',
      taxAmount: item.taxAmount != null ? String(item.taxAmount) : '',
    })
  }

  const cancelSingleEdit = () => {
    setEditingItemId(null)
    setSingleEdit({ actualPrice: '', taxAmount: '' })
  }

  const saveSingleEdit = async (itemId: string) => {
    const updates: Record<string, number | boolean> = {}
    if (singleEdit.actualPrice !== '') updates.actualPrice = Number(singleEdit.actualPrice)
    if (singleEdit.taxAmount !== '') updates.taxAmount = Number(singleEdit.taxAmount)
    const ap = singleEdit.actualPrice !== '' ? Number(singleEdit.actualPrice) : null
    if (ap != null && ap > 0) updates.purchased = true
    await updateOrderItem(itemId, updates)
    if (orderId) {
      await fetchOrderItems(orderId)
      const updatedItems = orderItems.get(orderId) ?? items
      const cost = calculateOrderCost(updatedItems)
      const charge = calculateCharge(cost, order!.exchangeRate, order!.serviceFeeRate)
      await updateOrder(order!.id, { totalCost: cost, totalCharge: charge })
    }
    setEditingItemId(null)
    setSingleEdit({ actualPrice: '', taxAmount: '' })
  }

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

  const handleGenerateBill = async () => {
    if (!orderId) return
    await fetchOrderItems(orderId)
    const updatedItems = orderItems.get(orderId) ?? items
    const cost = calculateOrderCost(updatedItems)
    const charge = calculateCharge(cost, order.exchangeRate, order.serviceFeeRate)
    await updateOrder(order.id, { totalCost: cost, totalCharge: charge })
    if (order.status === 'purchased') {
      await updateOrderStatus(order.id, 'pending_payment')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4 font-body">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-1 hover:bg-warm-200 rounded transition-colors">
          <ArrowLeft className="w-5 h-5 text-navy-600" />
        </button>
        <h1 className="text-2xl font-bold text-navy-600 font-display">
          订单详情
        </h1>
      </div>

      {order.status !== 'cancelled' && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center flex-1 relative">
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'absolute top-4 left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] h-0.5',
                    i < currentStepIndex ? 'bg-navy-600' : 'bg-warm-200'
                  )} />
                )}
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 z-10 transition-colors',
                  i < currentStepIndex ? 'bg-navy-600 text-white border-navy-600' :
                  i === currentStepIndex ? 'bg-amber-500 text-white border-amber-500' :
                  'bg-white text-gray-400 border-warm-200'
                )}>
                  {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  'text-xs mt-2 font-medium',
                  i <= currentStepIndex ? 'text-navy-600' : 'text-gray-400'
                )}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-3">
          <h3 className="font-semibold text-navy-600 text-base">基本信息</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs mb-1">客户</div>
              <div className="font-medium text-navy-700">{customer?.name ?? '-'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">订单日期</div>
              <div className="text-navy-700">{formatDate(order.orderDate)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">汇率</div>
              <div className="text-navy-700">{order.exchangeRate}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">服务费率</div>
              <div className="text-navy-700">{(order.serviceFeeRate * 100).toFixed(1)}%</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500 text-xs mb-1">备注</div>
              <div className="text-navy-700 whitespace-pre-wrap">{order.notes || '-'}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-3">
          <h3 className="font-semibold text-navy-600 text-base">费用计算</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs mb-1">总成本</div>
              <div className={cn(
                'font-medium text-lg',
                bulkEditMode && previewTotalCost !== order.totalCost ? 'text-amber-600' : 'text-navy-700'
              )}>
                {bulkEditMode ? formatCurrency(previewTotalCost) : formatCurrency(order.totalCost)}
                {bulkEditMode && previewTotalCost !== order.totalCost && (
                  <span className="text-xs ml-2 text-gray-500">(更新后)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">应收金额</div>
              <div className={cn(
                'font-bold text-xl',
                bulkEditMode && previewTotalCharge !== order.totalCharge ? 'text-amber-600' : 'text-navy-600'
              )}>
                {bulkEditMode ? formatCurrency(previewTotalCharge) : formatCurrency(order.totalCharge)}
                {bulkEditMode && previewTotalCharge !== order.totalCharge && (
                  <span className="text-xs ml-2 text-gray-500 font-normal">(更新后)</span>
                )}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-warm-200 text-xs text-gray-500 leading-relaxed">
            公式：应收 = 成本 × 汇率({order.exchangeRate}) × (1 + 服务费{(order.serviceFeeRate * 100).toFixed(1)}%)
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy-600 text-base">商品列表 <span className="text-gray-400 font-normal text-sm">· 共 {items.length} 件</span></h3>
          {(order.status === 'purchased' || order.status === 'pending_payment') && !bulkEditMode && (
            <button onClick={enterBulkEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
              <Edit3 className="w-3.5 h-3.5" />批量录入成本
            </button>
          )}
          {bulkEditMode && (
            <div className="flex gap-2">
              <button onClick={exitBulkEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors">
                <XCircle className="w-3.5 h-3.5" />取消
              </button>
              <button onClick={saveBulkEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-600 hover:bg-navy-500 text-white rounded-lg text-sm font-medium transition-colors">
                <Save className="w-3.5 h-3.5" />保存全部
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-warm-200 text-gray-500">
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wide">商品描述</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wide">链接</th>
                <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wide w-16">数量</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide w-24">期望价</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide w-32">实际价</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide w-24">税费</th>
                <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wide w-20">已购</th>
                {(order.status === 'purchased' || order.status === 'pending_payment') && !bulkEditMode && (
                  <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wide w-16">操作</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-warm-100 hover:bg-warm-50/70 transition-colors">
                  <td className="px-3 py-3 max-w-[220px]">
                    <div className="font-medium text-navy-700 truncate">{item.productDesc}</div>
                    <div className="text-xs text-gray-400 mt-0.5">币种 {item.currency}</div>
                  </td>
                  <td className="px-3 py-3">
                    {item.productLink ? (
                      <a href={item.productLink} target="_blank" rel="noreferrer" className="text-navy-500 hover:text-navy-700 hover:underline text-xs inline-flex items-center gap-1">
                        查看链接
                      </a>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-navy-700">x{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-gray-500 tabular-nums">{formatCurrency(item.expectedPrice, item.currency)}</td>

                  {bulkEditMode ? (
                    <>
                      <td className="px-3 py-3">
                        <input
                          value={editRows[item.id]?.actualPrice ?? ''}
                          onChange={e => updateEditRow(item.id, 'actualPrice', e.target.value)}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full text-right px-2 py-1.5 border border-warm-200 rounded-md focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-navy-700 tabular-nums text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          value={editRows[item.id]?.taxAmount ?? ''}
                          onChange={e => updateEditRow(item.id, 'taxAmount', e.target.value)}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full text-right px-2 py-1.5 border border-warm-200 rounded-md focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-navy-700 tabular-nums text-sm"
                        />
                      </td>
                    </>
                  ) : editingItemId === item.id ? (
                    <>
                      <td className="px-3 py-3">
                        <input
                          value={singleEdit.actualPrice}
                          onChange={e => setSingleEdit(s => ({ ...s, actualPrice: e.target.value }))}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full text-right px-2 py-1.5 border border-amber-400 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-navy-700 tabular-nums text-sm bg-amber-50/50"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          value={singleEdit.taxAmount}
                          onChange={e => setSingleEdit(s => ({ ...s, taxAmount: e.target.value }))}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full text-right px-2 py-1.5 border border-amber-400 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-navy-700 tabular-nums text-sm bg-amber-50/50"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {item.actualPrice != null ? (
                          <span className="text-navy-700 font-medium">{formatCurrency(item.actualPrice, item.currency)}</span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {item.taxAmount != null ? (
                          <span className="text-navy-700 font-medium">{formatCurrency(item.taxAmount, item.currency)}</span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                    </>
                  )}

                  <td className="px-3 py-3 text-center">
                    {item.purchased ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        <Check className="w-3 h-3" />已购
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                        <X className="w-3 h-3" />待购
                      </span>
                    )}
                  </td>

                  {(order.status === 'purchased' || order.status === 'pending_payment') && !bulkEditMode && (
                    <td className="px-3 py-3 text-center">
                      {editingItemId === item.id ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => saveSingleEdit(item.id)} title="保存"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelSingleEdit} title="取消"
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startSingleEdit(item.id)} title="编辑"
                          className="p-1 text-navy-500 hover:bg-navy-50 rounded transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {order.status === 'shipped' && order.trackingNumber && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 space-y-3">
          <h3 className="font-semibold text-navy-600 text-base flex items-center gap-2">
            <Truck className="w-4 h-4 text-navy-500" />物流信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs mb-1">快递单号</div>
              <div className="font-mono text-navy-700 text-lg tracking-wider">{order.trackingNumber}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">快递公司</div>
              <div className="text-navy-700">{order.shippingCompany ?? '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
        <h3 className="font-semibold text-navy-600 text-base mb-4">订单操作</h3>
        <div className="flex flex-wrap gap-3">
          {order.status === 'pending_purchase' && (
            <button onClick={handleMarkPurchased}
              className="px-5 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-500 transition-colors text-sm font-medium shadow-sm hover:shadow">
              标记已采购
            </button>
          )}
          {order.status === 'purchased' && (
            <>
              {!bulkEditMode && (
                <button onClick={enterBulkEdit}
                  className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm hover:shadow">
                  录入成本
                </button>
              )}
              <button onClick={handleGenerateBill}
                className="px-5 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-500 transition-colors text-sm font-medium shadow-sm hover:shadow">
                生成账单并通知买家
              </button>
            </>
          )}
          {order.status === 'pending_payment' && (
            <>
              <button onClick={handleMarkPaid}
                className="px-5 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-500 transition-colors text-sm font-medium shadow-sm hover:shadow">
                标记已付款
              </button>
              <button onClick={() => alert('已发送催付提醒给买家')}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm hover:shadow">
                催付提醒
              </button>
            </>
          )}
          {order.status === 'paid' && (
            <div className="w-full space-y-3">
              <div className="flex flex-wrap gap-3 items-stretch">
                <input
                  value={shippingForm.trackingNumber}
                  onChange={e => setShippingForm(s => ({ ...s, trackingNumber: e.target.value }))}
                  placeholder="请输入快递单号"
                  className="px-4 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-400/20 min-w-[220px]"
                />
                <input
                  value={shippingForm.shippingCompany}
                  onChange={e => setShippingForm(s => ({ ...s, shippingCompany: e.target.value }))}
                  placeholder="快递公司（如：顺丰、EMS）"
                  className="px-4 py-2.5 border border-warm-200 rounded-lg text-sm focus:outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-400/20 min-w-[200px]"
                />
                <button
                  onClick={handleMarkShipped}
                  disabled={!shippingForm.trackingNumber}
                  className="px-5 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm hover:shadow whitespace-nowrap">
                  录入物流并发货
                </button>
              </div>
            </div>
          )}
          {order.status === 'shipped' && (
            <button onClick={handleComplete}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium shadow-sm hover:shadow">
              确认买家签收，完成订单
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
