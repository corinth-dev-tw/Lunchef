import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Home, ClipboardList } from 'lucide-react'

function useCartCount() {
  const [count, setCount] = useState(0)
  const prevCount = useRef(0)
  const [popped, setPopped] = useState(false)

  useEffect(() => {
    const update = () => {
      try {
        const cart = JSON.parse(sessionStorage.getItem('cart') || '[]')
        const total = cart.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 0), 0)
        if (total !== prevCount.current) {
          setPopped(true)
          setTimeout(() => setPopped(false), 350)
        }
        prevCount.current = total
        setCount(total)
      } catch {
        setCount(0)
      }
    }
    update()
    window.addEventListener('cart-updated', update)
    return () => window.removeEventListener('cart-updated', update)
  }, [])

  return { count, popped }
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { count: cartCount, popped } = useCartCount()

  // Hide bottom nav on pages with their own bottom action bars
  const hiddenPaths = ['/cart', '/order-confirm']
  if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null

  const tabs = [
    { path: '/', label: '首頁', Icon: Home, showBadge: true },
    { path: '/orders', label: '訂單', Icon: ClipboardList, showBadge: false },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/menu') || location.pathname.startsWith('/restaurants') || location.pathname.startsWith('/locations')
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-md border-t border-gray-200/60 z-50 safe-area-pb shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                active ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="relative">
                <span
                  className={`flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
                    active ? 'bg-green-50' : ''
                  }`}
                >
                  <tab.Icon className="w-5 h-5" />
                </span>
                {tab.showBadge && cartCount > 0 && (
                  <span
                    className={`absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ring-2 ring-white ${
                      popped ? 'animate-badge-pop' : ''
                    }`}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span className={`text-[11px] font-medium mt-0.5 ${active ? 'text-green-600' : ''}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
