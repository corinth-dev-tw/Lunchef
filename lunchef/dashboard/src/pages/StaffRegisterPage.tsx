import { useState, useEffect } from 'react'
import liff from '@line/liff'
import { ChefHat } from 'lucide-react'

interface RegistrationStatus {
  status: string
  name: string
  message: string
  restaurant_name?: string
  role?: string
}

export default function StaffRegisterPage() {
  const [liffReady, setLiffReady] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [status, setStatus] = useState<RegistrationStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const liffId = import.meta.env.VITE_DASHBOARD_LIFF_ID || import.meta.env.VITE_LIFF_ID || '2010266926-wB4JsxVI'
    liff.init({ liffId, withLoginOnExternalBrowser: true })
      .then(() => {
        setLiffReady(true)
        if (liff.isLoggedIn()) {
          checkStatus()
        }
      })
      .catch((err) => {
        console.error('LIFF init failed:', err)
        setError('LINE SDK initialization failed')
      })
  }, [])

  const checkStatus = async () => {
    if (!liff.isLoggedIn()) return
    const accessToken = liff.getAccessToken()
    if (!accessToken) return

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/staff/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(data)
      }
    } catch (err: any) {
      console.error('Status check error:', err)
    }
  }

  const handleRegister = async () => {
    if (!liffReady) return
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href })
      return
    }

    const accessToken = liff.getAccessToken()
    if (!accessToken) {
      setError('No LINE access token')
      return
    }

    setRegistering(true)
    setError('')

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/staff/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      setStatus(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRegistering(false)
    }
  }

  const getStatusColor = (s?: string) => {
    switch (s) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Staff Registration</h1>
          <p className="text-gray-500 mt-1">Apply to become restaurant staff</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {status && (
          <div className={`border rounded-xl p-4 mb-4 ${getStatusColor(status.status)}`}>
            <p className="font-bold text-lg">{status.name}</p>
            <p className="text-sm mt-1">Status: <span className="font-semibold capitalize">{status.status}</span></p>
            <p className="text-sm mt-1">{status.message}</p>
            {status.restaurant_name && (
              <p className="text-sm mt-1">Assigned to: {status.restaurant_name} ({status.role})</p>
            )}
          </div>
        )}

        {status?.status === 'approved' && (
          <a
            href="/"
            className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl text-center transition"
          >
            Go to Dashboard
          </a>
        )}

        {!status || status.status === 'not_registered' ? (
          <button
            onClick={handleRegister}
            disabled={!liffReady || registering}
            className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34d] text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
          >
            {registering ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Registering...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.5 11.5c0-4.15-4.47-7.5-10-7.5S1.5 7.35 1.5 11.5c0 3.72 3.33 6.83 7.82 7.42.3.06.8.19.92.44.1.2.07.52.03.73l-.13.77c-.04.22-.18.87.76.47.93-.4 5.02-2.96 7.11-5.06a9.23 9.23 0 001.49-1.87c.65-1.1.99-2.15.99-2.96z"/>
                </svg>
                {liff.isLoggedIn() ? 'Register as Staff' : 'Login with LINE to Register'}
              </>
            )}
          </button>
        ) : null}

        {status?.status === 'pending' && (
          <p className="text-sm text-gray-500 text-center mt-4">
            Please wait for your admin to approve your request.
          </p>
        )}
      </div>
    </div>
  )
}
