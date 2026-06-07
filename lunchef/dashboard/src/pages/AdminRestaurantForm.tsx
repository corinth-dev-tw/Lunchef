import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from '../i18n'
import { adminApi } from '../utils/adminApi'
import { ArrowLeft, X } from 'lucide-react'

interface Location {
  id: number
  name: string
}

const DEFAULT_PICKUP_TIMES = ['11:30', '12:00', '12:30']

export default function AdminRestaurantForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const isEdit = !!id

  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '',
    cuisine_type: 'asian',
    department_store: '',
    floor: '',
    phone: '',
    image_url: '',
    order_cutoff_time: '09:00',
    min_order_type: 'items',
    min_order_value: 10,
    location_ids: [] as number[],
    pickup_times: [...DEFAULT_PICKUP_TIMES],
  })

  useEffect(() => {
    fetchLocations()
    if (isEdit) fetchRestaurant()
  }, [])

  const fetchLocations = async () => {
    try {
      const data = await adminApi.get<Location[]>('/api/admin/locations')
      setLocations(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchRestaurant = async () => {
    try {
      setLoading(true)
      const data = await adminApi.get<any>(`/api/admin/restaurants/${id}`)
      setForm({
        name: data.name || '',
        cuisine_type: data.cuisine_type || 'asian',
        department_store: data.department_store || '',
        floor: data.floor || '',
        phone: data.phone || '',
        image_url: data.image_url || '',
        order_cutoff_time: data.order_cutoff_time || '09:00',
        min_order_type: data.min_order_type || 'items',
        min_order_value: data.min_order_value || 10,
        location_ids: data.location_ids || [],
        pickup_times: data.pickup_times || [...DEFAULT_PICKUP_TIMES],
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (isEdit) {
        await adminApi.put(`/api/admin/restaurants/${id}`, form)
        setSuccess(t('common.success'))
      } else {
        await adminApi.post<{ id: number }>('/api/admin/restaurants', form)
        setSuccess(t('common.success'))
        setTimeout(() => navigate('/admin/restaurants'), 1500)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleLocation = (locId: number) => {
    setForm(prev => ({
      ...prev,
      location_ids: prev.location_ids.includes(locId)
        ? prev.location_ids.filter(id => id !== locId)
        : [...prev.location_ids, locId],
    }))
  }

  const updatePickupTime = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      pickup_times: prev.pickup_times.map((t, i) => i === index ? value : t),
    }))
  }

  const addPickupTime = () => {
    setForm(prev => ({ ...prev, pickup_times: [...prev.pickup_times, ''] }))
  }

  const removePickupTime = (index: number) => {
    setForm(prev => ({ ...prev, pickup_times: prev.pickup_times.filter((_, i) => i !== index) }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/admin/restaurants')} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {isEdit ? t('admin.restaurants.form.edit') : t('admin.restaurants.form.add')}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.restaurantName')}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.cuisineType')}</label>
              <select
                value={form.cuisine_type}
                onChange={e => setForm({ ...form, cuisine_type: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              >
                {(['thai','japanese','korean','chinese','italian','american','vietnamese','indian','asian'] as const).map(c => (
                  <option key={c} value={c}>{t(`cuisines.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.departmentStore')}</label>
              <input
                type="text"
                value={form.department_store}
                onChange={e => setForm({ ...form, department_store: e.target.value })}
                required
                placeholder={t('admin.restaurants.form.departmentStorePlaceholder')}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.floor')}</label>
              <input
                type="text"
                value={form.floor}
                onChange={e => setForm({ ...form, floor: e.target.value })}
                placeholder={t('admin.restaurants.form.floorPlaceholder')}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.phone')}</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder={t('admin.restaurants.form.phonePlaceholder')}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.imageUrl')}</label>
            <input
              type="url"
              value={form.image_url}
              onChange={e => setForm({ ...form, image_url: e.target.value })}
              placeholder={t('admin.restaurants.form.imageUrlPlaceholder')}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.orderBy')}</label>
              <input
                type="time"
                value={form.order_cutoff_time}
                onChange={e => setForm({ ...form, order_cutoff_time: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.minType')}</label>
              <select
                value={form.min_order_type}
                onChange={e => setForm({ ...form, min_order_type: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="items">{t('admin.restaurants.form.minTypeItems')}</option>
                <option value="amount">{t('admin.restaurants.form.minTypeAmount')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.restaurants.form.minValue')}</label>
              <input
                type="number"
                value={form.min_order_value}
                onChange={e => setForm({ ...form, min_order_value: parseInt(e.target.value) || 0 })}
                min={1}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.restaurants.form.availableLocations')}</label>
            <div className="flex flex-wrap gap-2">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => toggleLocation(loc.id)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border transition ${
                    form.location_ids.includes(loc.id)
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.restaurants.form.pickupTimes')}</label>
            <div className="space-y-2">
              {form.pickup_times.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="time"
                    value={time}
                    onChange={e => updatePickupTime(index, e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removePickupTime(index)}
                    className="px-3 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addPickupTime}
              className="mt-2 text-sm text-green-600 hover:text-green-800 font-medium"
            >
              {t('admin.restaurants.form.addPickupTime')}
            </button>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
            >
              {saving ? t('common.saving') : isEdit ? t('admin.restaurants.form.update') : t('admin.restaurants.form.create')}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
