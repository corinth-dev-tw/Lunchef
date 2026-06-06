import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onClose: () => void
  duration?: number
  variant?: 'warning' | 'error' | 'success'
}

export function Toast({ message, onClose, duration = 2500, variant = 'warning' }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in
    const showTimer = requestAnimationFrame(() => setVisible(true))
    // Auto-dismiss
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => {
      cancelAnimationFrame(showTimer)
      clearTimeout(hideTimer)
    }
  }, [duration, onClose])

  const colorMap = {
    warning: 'bg-orange-500',
    error: 'bg-red-500',
    success: 'bg-green-500',
  }

  return (
    <div
      className={`fixed top-4 left-1/2 z-[100] -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div
        className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${colorMap[variant]}`}
      >
        {message}
      </div>
    </div>
  )
}

/** Hook to imperatively fire toasts */
export function useToast() {
  const [toast, setToast] = useState<{ message: string; variant: ToastProps['variant'] } | null>(
    null,
  )

  const show = (message: string, variant: ToastProps['variant'] = 'warning') =>
    setToast({ message, variant })

  const ToastNode = toast ? (
    <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
  ) : null

  return { show, ToastNode }
}
