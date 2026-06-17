import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useCustomerStore } from '@/stores/customerStore'
import { useOrderStore } from '@/stores/orderStore'
import { ORDER_STATUS_MAP } from '@/types'
import { formatDate, formatCurrency } from '@/utils/format'
import { cn } from '@/lib/utils'

const TABS = ['档案', '订单', '偏好'] as const
type Tab = typeof TABS[number]

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const { customers, fetchCustomers, updateCustomer } = useCustomerStore()
  const { orders, fetchOrders } = useOrderStore()
  const [activeTab, setActiveTab] = useState<Tab>('档案')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', wechat: '', address: '', notes: '', preferenceTags: '' })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    fetchCustomers()
    fetchOrders()
  }, [])

  const customer = customers.find(c => c.id === customerId)
  const customerOrders = useMemo(() => orders.filter(o => o.customerId === customerId), [orders, customerId])

  useEffect(() => {
    if (customer && editing) {
      setEditForm({
        name: customer.name,
        phone: customer.phone,
        wechat: customer.wechat,
        address: customer.address,
        notes: customer.notes,
        preferenceTags: customer.preferenceTags.join(','),
      })
    }
  }, [editing])

  if (!customer) {
    return <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center text-gray-400">客户不存在</div>
  }

  const handleSave = async () => {
    await updateCustomer(customer.id, {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      wechat: editForm.wechat.trim(),
      address: editForm.address.trim(),
      notes: editForm.notes.trim(),
      preferenceTags: editForm.preferenceTags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    })
    setEditing(false)
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    await updateCustomer(customer.id, { preferenceTags: [...customer.preferenceTags, newTag.trim()] })
    setNewTag('')
  }

  const inputCls = 'w-full px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-[#1e3a5f]/50 text-sm'

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/customers')} className="p-1 hover:bg-gray-200 rounded">
            <ArrowLeft className="w-5 h-5 text-[#1e3a5f]" />
          </button>
          <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {customer.name}
          </h1>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors text-sm"
        >
          <Pencil className="w-4 h-4" />
          {editing ? '保存' : '编辑'}
        </button>
      </div>

      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-[#1e3a5f] text-white' : 'bg-white text-[#1e3a5f] hover:bg-gray-100'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === '档案' && (
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">姓名</label><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">电话</label><input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">微信</label><input value={editForm.wechat} onChange={e => setEditForm(f => ({ ...f, wechat: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">地址</label><input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label><textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-500">姓名</span><span>{customer.name}</span>
              <span className="text-gray-500">电话</span><span>{customer.phone || '-'}</span>
              <span className="text-gray-500">微信</span><span>{customer.wechat || '-'}</span>
              <span className="text-gray-500">地址</span><span>{customer.address || '-'}</span>
              <span className="text-gray-500">备注</span><span>{customer.notes || '-'}</span>
              <span className="text-gray-500">创建时间</span><span>{formatDate(customer.createdAt)}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === '订单' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {customerOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">暂无订单</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">订单日期</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="text-left px-4 py-3 font-medium">应收金额</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {customerOrders.map(order => {
                  const statusInfo = ORDER_STATUS_MAP[order.status]
                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>{statusInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1e3a5f]">{formatCurrency(order.totalCharge)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/orders/${order.id}`)} className="text-[#1e3a5f] hover:underline text-sm">查看</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === '偏好' && (
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {customer.preferenceTags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">{tag}</span>
            ))}
            {customer.preferenceTags.length === 0 && <span className="text-gray-400 text-sm">暂无偏好标签</span>}
          </div>
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              placeholder="添加标签..."
              className={inputCls}
            />
            <button onClick={handleAddTag} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#1e3a5f]/90 transition-colors shrink-0">
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
