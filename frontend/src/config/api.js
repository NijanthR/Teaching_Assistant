const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export function apiUrl(path = '') {
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`
  return `${API_BASE_URL}${normalizedPath}`
}