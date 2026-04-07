const rawApiBaseUrl = String(import.meta.env.VITE_API_URL || '').trim()
const isPlaceholder = /your-backend-domain\.com/i.test(rawApiBaseUrl)
const API_BASE_URL = (!rawApiBaseUrl || isPlaceholder ? window.location.origin : rawApiBaseUrl).replace(/\/+$/, '')

export function apiUrl(path = '') {
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`
  return `${API_BASE_URL}${normalizedPath}`
}