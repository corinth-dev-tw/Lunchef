import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/orders', label: 'Orders', icon: '📋' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              isActive(tab.path)
                ? 'text-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
