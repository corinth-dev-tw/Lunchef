import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Home, ClipboardList } from 'lucide-react'

function useCartCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const update = () => {
      try {
        const cart = JSON.parse(sessionStorage.getItem('cart') || '[]')
        const total = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        setCount(total)
      } catch {
        setCount(0)
      }
    }
    update()
    window.addEventListener('cart-updated', update)
    return () => {
      window.removeEventListener('cart-updated', update)
    }
  }, [])

  return count
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const cartCount = useCartCount()

  // Hide bottom nav on pages with their own bottom action bars
  const hiddenPaths = ['/menu/', '/cart', '/order-confirm']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) {
    return null
  }

  const tabs = [
    { path: '/', label: 'Home', Icon: Home },
    { path: '/orders', label: 'Orders', Icon: ClipboardList },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition relative ${
              isActive(tab.path)
                ? 'text-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="relative">
              <tab.Icon className="w-5 h-5" />
              {tab.path === '/' && cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            <span className="text-xs font-medium mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
