import { useEffect, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { db } from '@/db'
import type { AppSettings } from '@/types'

export default function Settings() {
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const [form, setForm] = useState<AppSettings>(settings)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const handleChange = (field: keyof AppSettings, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    updateSettings(form)
  }

  const handleExport = async () => {
    const [orders, orderItems, customers, trips] = await Promise.all([
      db.orders.toArray(),
      db.orderItems.toArray(),
      db.customers.toArray(),
      db.trips.toArray(),
    ])
    const data = { orders, orderItems, customers, trips }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daigou-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const data = JSON.parse(text)
      await db.transaction('rw', [db.orders, db.orderItems, db.customers, db.trips], async () => {
        await db.orders.clear()
        await db.orderItems.clear()
        await db.customers.clear()
        await db.trips.clear()
        if (data.orders?.length) await db.orders.bulkAdd(data.orders)
        if (data.orderItems?.length) await db.orderItems.bulkAdd(data.orderItems)
        if (data.customers?.length) await db.customers.bulkAdd(data.customers)
        if (data.trips?.length) await db.trips.bulkAdd(data.trips)
      })
      fetchSettings()
    }
    input.click()
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6 space-y-4" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <h1 className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Playfair Display', serif" }}>
        系统设置
      </h1>

      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h3 className="font-semibold text-[#1e3a5f]">卖家信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">卖家名称</label>
            <input value={form.sellerName} onChange={e => handleChange('sellerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">微信号</label>
            <input value={form.sellerWechat} onChange={e => handleChange('sellerWechat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">手机号</label>
            <input value={form.sellerPhone} onChange={e => handleChange('sellerPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h3 className="font-semibold text-[#1e3a5f]">计价规则</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">默认汇率</label>
            <input type="number" step="0.01" value={form.defaultExchangeRate}
              onChange={e => handleChange('defaultExchangeRate', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">默认服务费率 (%)</label>
            <input type="number" step="0.1" value={(form.defaultServiceFeeRate * 100).toFixed(1)}
              onChange={e => handleChange('defaultServiceFeeRate', Number(e.target.value) / 100)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">付款期限 (天)</label>
            <input type="number" value={form.paymentDeadlineDays}
              onChange={e => handleChange('paymentDeadlineDays', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h3 className="font-semibold text-[#1e3a5f]">数据管理</h3>
        <div className="flex gap-3">
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors text-sm">
            <Download className="w-4 h-4" />导出数据
          </button>
          <button onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 bg-[#d4a853] text-white rounded-lg hover:bg-[#d4a853]/90 transition-colors text-sm">
            <Upload className="w-4 h-4" />导入数据
          </button>
        </div>
      </div>

      <button onClick={handleSave}
        className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e3a5f]/90 transition-colors font-medium">
        保存设置
      </button>
    </div>
  )
}
