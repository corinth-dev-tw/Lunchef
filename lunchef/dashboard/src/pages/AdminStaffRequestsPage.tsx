import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { adminApi } from '../utils/adminApi'

interface StaffRequest {
  id: number
  line_user_id: string
  name: string
  status: string
  requested_at: string
  restaurant_name: string | null
  role: string | null
}

interface Restaurant {
  id: number
  name: string
}

export default function AdminStaffRequestsPage() {
  const navigate = useNavigate()
  const { token, logout } = useAdminAuth()
  const [requests, setRequests] = useState<StaffRequest[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [approveRestaurantId, setApproveRestaurantId] = useState('')
  const [approveRole, setApproveRole] = useState('staff')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (token) {
      adminApi.setToken(token)
      fetchRequests()
      fetchRestaurants()
    }
  }, [token])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await adminApi.get<StaffRequest[]>('/api/admin/staff-requests')
      setRequests(data)
    } catch (err: any) {
      setError(err.message)
      if (err.message?.includes('Unauthorized')) logout()
    } finally {
      setLoading(false)
    }
  }

  const fetchRestaurants = async () => {
    try {
      const data = await adminApi.get<Restaurant[]>('/api/admin/restaurants')
      setRestaurants(data)
    } catch (err: any) {
      console.error('Error fetching restaurants:', err)
    }
  }

  const handleApprove = async (id: number) => {
    if (!approveRestaurantId) {
      setError('Please select a restaurant')
      return
    }
    setProcessing(true)
    try {
      await adminApi.post(`/api/admin/staff-requests/${id}/approve`, {
        restaurant_id: parseInt(approveRestaurantId),
        role: approveRole,
      })
      setApprovingId(null)
      setApproveRestaurantId('')
      setApproveRole('staff')
      fetchRequests()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('確定要拒絕此申請嗎？')) return
    setProcessing(true)
    try {
      await adminApi.post(`/api/admin/staff-requests/${id}/reject`, {})
      fetchRequests()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">職員申請</h1>
            <p className="text-sm text-gray-500">審核職員加入申請</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/restaurants')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              餐廳管理
            </button>
            <button
              onClick={() => navigate('/admin/locations')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              地點管理
            </button>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              訂單總覽
            </button>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">目前無待審核的職員申請。</p>
            <p className="text-sm text-gray-400 mt-2">
              職員可至此頁面申請：<code className="bg-gray-100 px-2 py-1 rounded">/register-staff</code>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{req.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{req.line_user_id}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      申請時間：{new Date(req.requested_at).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                    {({'pending':'待審核','approved':'已核准','rejected':'已拒絕'} as Record<string,string>)[req.status] || req.status}
                  </span>
                </div>

                {approvingId === req.id ? (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select
                        value={approveRestaurantId}
                        onChange={(e) => setApproveRestaurantId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="">選擇餐廳...</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <select
                        value={approveRole}
                        onChange={(e) => setApproveRole(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="staff">職員</option>
                        <option value="manager">管理者</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={processing || !approveRestaurantId}
                        className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded transition disabled:opacity-50"
                      >
                        {processing ? '處理中...' : '確認核准'}
                      </button>
                      <button
                        onClick={() => { setApprovingId(null); setApproveRestaurantId(''); }}
                        className="text-gray-500 text-sm font-medium py-2 px-4"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setApprovingId(req.id); setApproveRestaurantId(''); setApproveRole('staff'); }}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded transition"
                    >
                      核准
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium py-2 px-4"
                    >
                      拒絕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
