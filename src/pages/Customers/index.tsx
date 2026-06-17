import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useCustomerStore } from '@/stores/customerStore'
import { useOrderStore } from '@/stores/orderStore'

export default function Customers() {
  const navigate = useNavigate()
  const { customers, fetchCustomers, createCustomer } = useCustomerStore()
  const { orders, fetchOrders } = useOrderStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', wechat: '', address: '', notes: '', preferenceTags: '' })

  useEffect(() => {
    fetchCustomers()
    fetchOrders()
  }, [])

  const orderCountMap = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach(o => map.set(o.customerId, (map.get(o.customerId) ?? 0) + 1))
    return map
  }, [orders])

  const filtered = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.wechat.toLowerCase().includes(q)
    )
  }, [customers, search])

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    await createCustomer({
      name: form.name.trim(),
      phone: form.phone.trim(),
      wechat: form.wechat.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      preferenceTags: form.preferenceTags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    })
    setForm({ name: '', phone: '', wechat: '', address: '', notes: '', preferenceTags: '' })
    setShowModal(false)
  }

  const inputCls = 'w-full px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-[#1e3a5f]/50 text-sm'

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
          客户管理
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建客户
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索姓名/电话/微信..."
          className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-[#1e3a5f]/50 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(customer => (
          <div key={customer.id} className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {customer.name[0]}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[#1e3a5f] truncate">{customer.name}</div>
                {customer.phone && <div className="text-sm text-gray-500 truncate">{customer.phone}</div>}
                {customer.wechat && <div className="text-sm text-gray-500 truncate">微信: {customer.wechat}</div>}
              </div>
            </div>
            {customer.preferenceTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customer.preferenceTags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">{tag}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">{orderCountMap.get(customer.id) ?? 0}笔订单</span>
              <button
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="text-sm text-[#1e3a5f] hover:underline"
              >
                查看详情
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1e3a5f]">新建客户</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">微信</label>
                <input value={form.wechat} onChange={e => setForm(f => ({ ...f, wechat: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">偏好标签（逗号分隔）</label>
                <input value={form.preferenceTags} onChange={e => setForm(f => ({ ...f, preferenceTags: e.target.value }))} className={inputCls} placeholder="如: 奶粉,护肤品" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#1e3a5f]/90 transition-colors">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
