import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../i18n'
import { api } from '../utils/api'
import liff from '@line/liff'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isLoggedIn, login } = useAuth()
  const [error, setError] = useState('')
  const [liffReady, setLiffReady] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/orders')
      return
    }

    // Use a separate LIFF ID for dashboard if available, fallback to main LIFF ID
    const liffId = import.meta.env.VITE_DASHBOARD_LIFF_ID || import.meta.env.VITE_LIFF_ID || '2010266926-wB4JsxVI'

    liff.init({ liffId, withLoginOnExternalBrowser: true })
      .then(() => {
        setLiffReady(true)

        // Already logged in via LIFF? Exchange token
        if (liff.isLoggedIn()) {
          handleLiffLogin()
        }
      })
      .catch((err) => {
        console.error('LIFF init failed:', err)
        setError(t('errors.generic'))
      })
  }, [isLoggedIn, t])

  const handleLiffLogin = async () => {
    if (!liff.isLoggedIn()) return
    setLoggingIn(true)
    setError('')

    try {
      const accessToken = liff.getAccessToken()
      if (!accessToken) {
        throw new Error('No LINE access token')
      }

      const data = await api.post<{
        success: boolean
        token: string
        restaurant: { id: number; name: string }
        staff?: { name: string; role: string }
      }>('/api/dashboard/line-login', { access_token: accessToken })

      login(data.restaurant.id, data.restaurant.name)
      navigate('/orders')
    } catch (err: any) {
      console.error('LINE login error:', err)
      setError(err.message || t('errors.generic'))
      // Logout from LIFF so they can retry
      liff.logout()
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLineLoginClick = async () => {
    if (!liffReady) return
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href })
      return
    }
    await handleLiffLogin()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{t('login.title')}</h1>
          <p className="text-gray-600 mt-2">{t('login.subtitle')}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLineLoginClick}
            disabled={!liffReady || loggingIn}
            className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34d] text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('auth.loggingIn')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.5 11.5c0-4.15-4.47-7.5-10-7.5S1.5 7.35 1.5 11.5c0 3.72 3.33 6.83 7.82 7.42.3.06.8.19.92.44.1.2.07.52.03.73l-.13.77c-.04.22-.18.87.76.47.93-.4 5.02-2.96 7.11-5.06a9.23 9.23 0 001.49-1.87c.65-1.1.99-2.15.99-2.96z"/>
                </svg>
                {t('auth.loginWithLine')}
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            {t('login.lineNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
