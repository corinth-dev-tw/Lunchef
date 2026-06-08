import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminRestaurantsPage from './pages/AdminRestaurantsPage'
import AdminRestaurantForm from './pages/AdminRestaurantForm'
import AdminLocationsPage from './pages/AdminLocationsPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminStaffRequestsPage from './pages/AdminStaffRequestsPage'
import StaffRegisterPage from './pages/StaffRegisterPage'
import { AuthProvider } from './contexts/AuthContext'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { I18nProvider } from './i18n'

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-100">
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route path="/admin/restaurants" element={<AdminRestaurantsPage />} />
                <Route path="/admin/restaurants/new" element={<AdminRestaurantForm />} />
                <Route path="/admin/restaurants/:id/edit" element={<AdminRestaurantForm />} />
                <Route path="/admin/locations" element={<AdminLocationsPage />} />
                <Route path="/admin/orders" element={<AdminOrdersPage />} />
                <Route path="/admin/staff-requests" element={<AdminStaffRequestsPage />} />
                <Route path="/register-staff" element={<StaffRegisterPage />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AdminAuthProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

export default App
