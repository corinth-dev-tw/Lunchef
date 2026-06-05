const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Send cookies cross-origin
    })

    if (response.status === 401) {
      // Token expired or invalid — clear state and reload
      localStorage.removeItem('dashboard_restaurant_id')
      localStorage.removeItem('dashboard_restaurant_name')
      window.location.href = '/'
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }
}

export const api = new ApiClient()
