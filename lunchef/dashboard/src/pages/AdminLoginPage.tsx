import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { useTranslation } from '../i18n'
import { Shield } from 'lucide-react'
import liff from '@line/liff'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAdmin, login } = useAdminAuth()
  const [error, setError] = useState('')
  const [liffReady, setLiffReady] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

  // Only auto-redirect if we have a token AND isAdmin is confirmed.
  // We do NOT auto-redirect on first mount to avoid a redirect loop when
  // the stored token has expired (adminApi clears it on 401).
  useEffect(() => {
    if (!isAdmin) return

    // Confirm the stored token actually exists before redirecting
    const token = localStorage.getItem('admin_token')
    if (token) {
      navigate('/admin/restaurants')
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    const liffId = import.meta.env.VITE_DASHBOARD_LIFF_ID || import.meta.env.VITE_LIFF_ID || '2010266926-wB4JsxVI'
    liff.init({ liffId, withLoginOnExternalBrowser: true })
      .then(() => {
        setLiffReady(true)
        // Auto-trigger login only if we do NOT already have a valid session
        const hasToken = !!localStorage.getItem('admin_token')
        if (liff.isLoggedIn() && !hasToken) {
          handleLiffLogin()
        }
      })
      .catch((err) => {
        console.error('LIFF init failed:', err)
        setError(t('errors.generic'))
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLiffLogin = async () => {
    if (!liff.isLoggedIn()) return
    setLoggingIn(true)
    setError('')

    try {
      const accessToken = liff.getAccessToken()
      if (!accessToken) throw new Error(t('errors.generic'))

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/line-login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
          credentials: 'include',
        }
      )

      const data = await res.json() as { success?: boolean; token?: string; error?: string; name?: string }
      if (!res.ok) {
        throw new Error(data.error || t('errors.unauthorized'))
      }

      if (!data.token) {
        throw new Error('No session token received')
      }

      login(data.token)
      navigate('/admin/restaurants')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.generic')
      setError(msg)
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{t('auth.adminPanel')}</h1>
          <p className="text-gray-500 mt-1">{t('login.subtitle')}</p>
        </div>

        <button
          onClick={handleLineLoginClick}
          disabled={!liffReady || loggingIn}
          className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34d] text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loggingIn ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
