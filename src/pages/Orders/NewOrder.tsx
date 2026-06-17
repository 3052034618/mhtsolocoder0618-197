import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useOrderStore } from '@/stores/orderStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useTripStore } from '@/stores/tripStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatDate } from '@/utils/format'

const CURRENCIES = ['JPY', 'USD', 'EUR', 'KRW', 'GBP', 'AUD', 'CNY']

interface FormItem {
  productDesc: string
  productLink: string
  quantity: number
  expectedPrice: number
  currency: string
}

const emptyItem = (): FormItem => ({
  productDesc: '',
  productLink: '',
  quantity: 1,
  expectedPrice: 0,
  currency: 'JPY',
})

export default function NewOrder() {
  const navigate = useNavigate()
  const { createOrder } = useOrderStore()
  const { customers, fetchCustomers, createCustomer } = useCustomerStore()
  const { trips, fetchTrips } = useTripStore()
  const { settings } = useSettingsStore()

  const [customerId, setCustomerId] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newWechat, setNewWechat] = useState('')
  const [tripId, setTripId] = useState('')
  const [exchangeRate, setExchangeRate] = useState(settings.defaultExchangeRate)
  const [serviceFeeRate, setServiceFeeRate] = useState(settings.defaultServiceFeeRate)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormItem[]>([emptyItem()])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCustomers()
    fetchTrips()
  }, [])

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    try {
      let cId = customerId
      if (customerId === '__new__') {
        cId = await createCustomer({
          name: newName,
          phone: newPhone,
          wechat: newWechat,
          address: '',
          notes: '',
          preferenceTags: [],
        })
      }

      const orderId = await createOrder(
        {
          customerId: cId,
          tripId: tripId || undefined,
          status: 'pending_purchase',
          orderDate: new Date(),
          exchangeRate,
          serviceFeeRate,
          notes,
        },
        items.map(item => ({
          productDesc: item.productDesc,
          productLink: item.productLink,
          quantity: item.quantity,
          expectedPrice: item.expectedPrice,
          currency: item.currency,
        })),
      )

      navigate(`/orders/${orderId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-6" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#1e3a5f] hover:text-[#d4a853] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
          新建订单
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1e3a5f] border-b border-gray-100 pb-2">客户信息</h2>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">选择客户</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40"
            >
              <option value="">请选择客户</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__new__">新建客户</option>
            </select>
          </div>
          {customerId === '__new__' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">姓名</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">手机号</label>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">微信号</label>
                <input value={newWechat} onChange={e => setNewWechat(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1e3a5f] border-b border-gray-100 pb-2">订单信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">出行计划</label>
              <select value={tripId} onChange={e => setTripId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40">
                <option value="">无</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{t.destination} ({formatDate(t.departureDate)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">汇率</label>
              <input type="number" step="0.01" min="0" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">服务费率 (%)</label>
              <input type="number" step="0.1" min="0" max="100"
                value={(serviceFeeRate * 100).toFixed(1)}
                onChange={e => setServiceFeeRate(Number(e.target.value) / 100)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">备注</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40 resize-none" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1e3a5f] border-b border-gray-100 pb-2">商品列表</h2>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">商品描述</label>}
                  <input value={item.productDesc} onChange={e => updateItem(index, 'productDesc', e.target.value)} required
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
                </div>
                <div className="col-span-3">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">商品链接</label>}
                  <input value={item.productLink} onChange={e => updateItem(index, 'productLink', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
                </div>
                <div className="col-span-1">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">数量</label>}
                  <input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} required
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
                </div>
                <div className="col-span-2">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">期望价</label>}
                  <input type="number" step="0.01" min="0" value={item.expectedPrice || ''} onChange={e => updateItem(index, 'expectedPrice', Number(e.target.value))} required
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40" />
                </div>
                <div className="col-span-2">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">币种</label>}
                  <select value={item.currency} onChange={e => updateItem(index, 'currency', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/40">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-1 flex justify-center">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1 sr-only">操作</label>}
                  <button type="button" onClick={() => removeItem(index)} disabled={items.length <= 1}
                    className="p-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem}
            className="flex items-center gap-1.5 text-sm text-[#d4a853] hover:text-[#d4a853]/80 font-medium transition-colors">
            <Plus className="w-4 h-4" />
            添加商品
          </button>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <button type="submit" disabled={submitting}
            className="btn-primary px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 disabled:opacity-50 transition-colors text-sm font-medium">
            {submitting ? '创建中...' : '创建订单'}
          </button>
        </div>
      </form>
    </div>
  )
}
