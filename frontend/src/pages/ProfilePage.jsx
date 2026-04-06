import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMail, FiShield, FiUser } from 'react-icons/fi'
import { useTheme } from '../context/ThemeContext.jsx'

const PROFILE_STORAGE_KEY = 'teaching-assistant-google-user'

function getStoredProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function ProfilePage() {
  const { theme, t } = useTheme()
  const isDark = theme === 'dark'
  const profile = useMemo(() => getStoredProfile(), [])
  const navigate = useNavigate()
  const [imageError, setImageError] = useState(false)

  const name = String(profile?.name || 'Student')
  const email = String(profile?.email || 'Not available')
  const picture = String(profile?.picture || '')
  const normalizedPicture = picture.startsWith('http:')
    ? picture.replace('http:', 'https:')
    : picture.startsWith('//')
      ? `https:${picture}`
      : picture
  const showPicture = Boolean(normalizedPicture) && !imageError
  const userId = String(profile?.sub || 'Not available')
  const provider = profile?.email ? 'Google' : 'Local'

  const handleSignOut = () => {
    localStorage.removeItem(PROFILE_STORAGE_KEY)
    navigate('/', { replace: true })
  }

  return (
    <div className={`flex h-full w-full flex-col overflow-y-auto ${t.pageBg}`}>
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-900/70' : 'border-teal-200 bg-white/70'}`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative">
              {showPicture ? (
                <img
                  src={normalizedPicture}
                  alt={name}
                  className="h-24 w-24 rounded-2xl object-cover shadow-lg"
                  onError={() => setImageError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-linear-to-br from-emerald-200 via-teal-200 to-cyan-300 text-2xl font-semibold text-slate-700">
                  {name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-800 text-teal-200' : 'bg-teal-100 text-teal-800'}`}>
                {provider}
              </span>
            </div>

            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-teal-100' : 'text-teal-900'}`}>{name}</h1>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Profile overview</p>
              <button
                type="button"
                onClick={handleSignOut}
                className={`mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isDark
                    ? 'bg-slate-800 text-teal-200 hover:bg-slate-700'
                    : 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                }`}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ProfileCard
            icon={<FiUser className="h-4 w-4" />}
            label="Display name"
            value={name}
            isDark={isDark}
          />
          <ProfileCard
            icon={<FiMail className="h-4 w-4" />}
            label="Email"
            value={email}
            isDark={isDark}
          />
          <ProfileCard
            icon={<FiShield className="h-4 w-4" />}
            label="Auth provider"
            value={provider}
            isDark={isDark}
          />
          <ProfileCard
            icon={<FiShield className="h-4 w-4" />}
            label="User id"
            value={userId}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ icon, label, value, isDark }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-teal-200 bg-white/70'}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? 'bg-slate-800 text-teal-300' : 'bg-teal-100 text-teal-700'}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-sm font-semibold ${isDark ? 'text-teal-100' : 'text-teal-900'}`}>{value}</p>
      </div>
    </div>
  )
}

export default ProfilePage
