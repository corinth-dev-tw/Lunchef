import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation, formatTwd } from '../i18n'
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

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
      setError(err.message || t('errors.loadFailed'))
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
      setError(err.message || t('errors.updateFailed'))
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
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">{t('staffDashboard.orderNotFound')}</p>
      </div>
    )
  }

  const nextStatus = getNextStatus(order.status)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 print:hidden">
        <div className="flex justify-between items-center">
          <button onClick={() => navigate('/orders')} className="text-gray-600 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4 inline" /> {t('staffDashboard.backToOrders')}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold"
          >
            {t('staffDashboard.print')}
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
              <p className="text-2xl font-bold capitalize">{t(`order.statuses.${order.status}`)}</p>
              <p className="text-gray-600">{t('staffDashboard.pickup')}: {order.order_date} {order.pickup_time}</p>
            </div>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">{t('staffDashboard.companyInformation')}</h3>
              <p><span className="text-gray-600">{t('staffDashboard.customer')}: </span>{order.company_name}</p>
              <p><span className="text-gray-600">{t('admin.orders.table.taxId') || 'Tax ID'}: </span>{order.tax_id}</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">{t('staffDashboard.contactInformation')}</h3>
              <p><span className="text-gray-600">{t('staffDashboard.customer')}: </span>{order.user_name}</p>
              <p><span className="text-gray-600">{t('staffDashboard.phone')}: </span>{order.user_phone}</p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-bold text-gray-800 mb-4">{t('staffDashboard.orderItems')}</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t('staffDashboard.item')}</th>
                  <th className="text-center py-2">{t('staffDashboard.qty')}</th>
                  <th className="text-right py-2">{t('staffDashboard.price')}</th>
                  <th className="text-right py-2">{t('staffDashboard.total')}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">
                      <p className="font-bold">{item.menu_item_name}</p>
                      {item.special_requests && (
                        <p className="text-sm text-orange-600">{t('order.cancellationReason') || 'Note'}: {item.special_requests}</p>
                      )}
                    </td>
                    <td className="text-center py-3">{item.quantity}</td>
                    <td className="text-right py-3">{formatTwd(item.unit_price)}</td>
                    <td className="text-right py-3 font-bold">{formatTwd(item.unit_price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center mb-6 pb-6 border-b">
            <div>
              <p><span className="text-gray-600">{t('staffDashboard.paymentMethod')}: </span>{order.payment_method === 'cash' ? t('cart.payment.cash') : t('cart.payment.creditCard')}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">{formatTwd(order.total_amount)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 print:hidden">
            {nextStatus && (
              <button
                onClick={() => updateStatus(nextStatus)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                {t(`order.statuses.${nextStatus}`)}
              </button>
            )}
            
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={() => {
                  const reason = prompt(t('staffDashboard.cancellationReason'))
                  if (reason) updateStatus('cancelled', reason)
                }}
                className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition"
              >
                {t('staffDashboard.cancelOrder')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
