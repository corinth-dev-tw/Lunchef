import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
// Auth context not needed here since api client handles token
import { api } from '../utils/api'
import { ArrowLeft } from 'lucide-react'

interface OrderDetail {
  id: number
  order_number: string
  company_name: string
  tax_id: string
  user_name: string
  user_phone: string
  total_amount: number
  status: string
  pickup_time: string
  order_date: string
  payment_method: string
  cancellation_reason: string
  created_at: string
  items: Array<{
    id: number
    menu_item_name: string
    quantity: number
    unit_price: number
    special_requests: string
  }>
}

const statusFlow = ['pending', 'confirmed', 'preparing', 'arrived', 'completed']

const statusLabels: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  preparing: '準備中',
  arrived: '已送達',
  completed: '已完成',
  cancelled: '已取消',
}

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail()
    }
  }, [orderId])

  const fetchOrderDetail = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<OrderDetail>(`/api/dashboard/orders/${orderId}`)
      setOrder(data)
    } catch (err: any) {
      console.error('Error fetching order:', err)
      setError(err.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: string, reason?: string) => {
    try {
      await api.put(`/api/dashboard/orders/${orderId}/status`, {
        status: newStatus,
        cancellation_reason: reason,
      })
      fetchOrderDetail()
    } catch (err: any) {
      console.error('Error updating status:', err)
      setError(err.message || 'Failed to update status')
    }
  }

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus)
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return null
    return statusFlow[currentIndex + 1]
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchOrderDetail}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
        >
          重試
        </button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">找不到此訂單。</p>
      </div>
    )
  }

  const nextStatus = getNextStatus(order.status)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 print:hidden">
        <div className="flex justify-between items-center">
          <button onClick={() => navigate('/orders')} className="text-gray-600">
            <ArrowLeft className="w-4 h-4 inline" /> 返回訂單列表
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold"
          >
            列印
          </button>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Order Header */}
          <div className="flex justify-between items-start mb-6 pb-6 border-b">
            <div>
              <h1 className="text-3xl font-bold">{order.order_number}</h1>
              <p className="text-gray-600 mt-1">
                {new Date(order.created_at).toLocaleString('zh-TW')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{statusLabels[order.status] || order.status}</p>
              <p className="text-gray-600">取餐：{order.order_date} {order.pickup_time}</p>
            </div>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">公司資訊</h3>
              <p><span className="text-gray-600">名稱：</span>{order.company_name}</p>
              <p><span className="text-gray-600">統一編號：</span>{order.tax_id}</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">聯絡資訊</h3>
              <p><span className="text-gray-600">姓名：</span>{order.user_name}</p>
              <p><span className="text-gray-600">電話：</span>{order.user_phone}</p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-bold text-gray-800 mb-4">餐點明細</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">品項</th>
                  <th className="text-center py-2">數量</th>
                  <th className="text-right py-2">單價</th>
                  <th className="text-right py-2">小計</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">
                      <p className="font-bold">{item.menu_item_name}</p>
                      {item.special_requests && (
                        <p className="text-sm text-orange-600">備注：{item.special_requests}</p>
                      )}
                    </td>
                    <td className="text-center py-3">{item.quantity}</td>
                    <td className="text-right py-3">${item.unit_price}</td>
                    <td className="text-right py-3 font-bold">${item.unit_price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center mb-6 pb-6 border-b">
            <div>
              <p><span className="text-gray-600">付款方式：</span>{order.payment_method === 'cash' ? '取餐付現' : '現場刷卡'}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">${order.total_amount}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 print:hidden">
            {nextStatus && (
              <button
                onClick={() => updateStatus(nextStatus)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                標記為{statusLabels[nextStatus] || nextStatus}
              </button>
            )}

            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={() => {
                  const reason = prompt('取消原因：')
                  if (reason) updateStatus('cancelled', reason)
                }}
                className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition"
              >
                取消訂單
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
