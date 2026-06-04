import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LiffProvider } from './contexts/LiffContext'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import LocationSelectPage from './pages/LocationSelectPage'
import RestaurantListPage from './pages/RestaurantListPage'
import MenuPage from './pages/MenuPage'
import CartPage from './pages/CartPage'
import OrderConfirmPage from './pages/OrderConfirmPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import OrderDetailPage from './pages/OrderDetailPage'

function App() {
  return (
    <LiffProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/locations" element={<LocationSelectPage />} />
            <Route path="/restaurants" element={<RestaurantListPage />} />
            <Route path="/menu/:restaurantId" element={<MenuPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/order-confirm" element={<OrderConfirmPage />} />
            <Route path="/orders" element={<OrderHistoryPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </LiffProvider>
  )
}

export default App
