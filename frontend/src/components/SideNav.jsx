import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FiActivity, FiChevronRight, FiHome, FiSettings, FiUsers } from 'react-icons/fi'
import { useTheme } from '../context/ThemeContext.jsx'
import hatLogo from '../assets/HAT.png'

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', to: '/app', exact: true },
  { label: 'Test', icon: 'activity', to: '/app/test' },
  { label: 'Community', icon: 'users', to: '/app/community' },
]

const synexisLogoUrl = hatLogo
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

function SideNav() {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [imageError, setImageError] = useState(false)
  const { t } = useTheme()
  const profile = getStoredProfile()
  const profileName = String(profile?.name || 'Student')
  const profileEmail = String(profile?.email || 'student@local')
  const profileImage = String(profile?.picture || '')
  const normalizedProfileImage = profileImage.startsWith('http:')
    ? profileImage.replace('http:', 'https:')
    : profileImage.startsWith('//')
      ? `https:${profileImage}`
      : profileImage
  const showProfileImage = Boolean(normalizedProfileImage) && !imageError

  useEffect(() => {
    setImageError(false)
  }, [normalizedProfileImage])

  return (
    <aside
      className={`flex h-full flex-col overflow-hidden border-r px-3 pb-5 pt-6 transition-[width] duration-300 ease-out ${t.sidebarBg} ${t.sidebarBorder} ${t.sidebarText} ${
        isCollapsed ? 'w-24' : 'w-72'
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-transparent">
            <img
              src={synexisLogoUrl}
              alt="Synexis logo"
              className="h-10 w-10 rounded-xl object-contain"
            />
          </div>
          <span className={`overflow-hidden whitespace-nowrap text-lg font-semibold tracking-wide transition-[opacity,max-width] duration-300 ease-out ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>Straw Hat</span>
        </div>
        <button
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${t.sidebarChevron}`}
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <FiChevronRight className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className={`mt-6 h-px w-full bg-linear-to-r from-transparent ${t.sidebarDivider} to-transparent`} />

      <nav className="mt-6 space-y-2 text-sm">
        {navItems.map((item) => (
          <SidebarItem key={item.label} {...item} collapsed={isCollapsed} />
        ))}
      </nav>

      <div className="mt-auto">
        <div className={`mt-6 h-px w-full bg-linear-to-r from-transparent ${t.sidebarDivider} to-transparent`} />

        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            `mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
              isActive ? t.sidebarActive : t.sidebarSettingsHover
            }`
          }
          title={isCollapsed ? 'Settings' : undefined}
        >
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.sidebarIconBg} ${t.sidebarIconText}`}>
            <FiSettings className="h-5 w-5" />
          </span>
          <span className={`overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-out ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>Settings</span>
        </NavLink>

        <NavLink
          to="/app/profile"
          className={`mt-4 flex items-center gap-3 rounded-xl px-3 py-3 transition ${t.sidebarUserCard}`}
          title={isCollapsed ? 'Profile' : undefined}
        >
          {showProfileImage ? (
            <img
              src={normalizedProfileImage}
              alt={profileName}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              onError={() => setImageError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-radial-[at_top] from-white via-teal-300 to-teal-500 text-sm font-semibold text-slate-700">
              {profileName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className={`overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-out ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
            <p className={`text-sm font-semibold ${t.sidebarUserName}`}>{profileName}</p>
            <p className={`text-[11px] ${t.sidebarUserEmail}`}>{profileEmail}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}

function SidebarItem({ label, icon, to, collapsed = false, exact = false }) {
  const hasIcon = Boolean(icon)
  const { t } = useTheme()

  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
          isActive ? t.sidebarActive : t.sidebarHover
        }`
      }
      title={collapsed ? label : undefined}
    >
      {hasIcon && (
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.sidebarIconBg} ${t.sidebarIconText}`}>
          <NavIcon type={icon} />
        </span>
      )}
      <span className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-[opacity,max-width] duration-300 ease-out ${collapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
        {label}
      </span>
    </NavLink>
  )
}

function NavIcon({ type }) {
  switch (type) {
    case 'dashboard':
      return <FiHome className="h-5 w-5" />
    case 'activity':
      return <FiActivity className="h-5 w-5" />
    case 'users':
      return <FiUsers className="h-5 w-5" />
    default:
      return <FiHome className="h-5 w-5" />
  }
}

export default SideNav
