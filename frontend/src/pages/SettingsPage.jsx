import { FiMoon, FiSun } from 'react-icons/fi'
import { LANGUAGE_OPTIONS, useTheme } from '../context/ThemeContext.jsx'

function SettingsPage() {
  const { theme, toggleTheme, language, setLanguage, t } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`flex h-full w-full flex-col overflow-y-auto ${t.pageBg}`}>
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-teal-100' : 'text-teal-900'}`}>Settings</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Manage your preferences</p>

        <div className={`mt-8 rounded-2xl border p-6 ${isDark ? 'border-slate-600 bg-slate-800/60' : 'border-teal-200 bg-white/60'}`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Appearance</h2>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-teal-100' : 'text-teal-900'}`}>Theme</p>
              <p className={`mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isDark ? 'Dark — grey & teal' : 'Light — white & teal'}
              </p>
            </div>

            {/* Toggle switch */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`relative flex h-8 w-16 items-center rounded-full border transition-colors duration-300 ${
                isDark ? 'border-teal-700 bg-slate-700' : 'border-teal-300 bg-teal-100'
              }`}
            >
              <span
                className={`absolute flex h-6 w-6 items-center justify-center rounded-full shadow transition-all duration-300 ${
                  isDark
                    ? 'left-8.5 bg-slate-900 text-teal-400'
                    : 'left-1 bg-white text-teal-600'
                }`}
              >
                {isDark ? <FiMoon className="h-3.5 w-3.5" /> : <FiSun className="h-3.5 w-3.5" />}
              </span>
            </button>
          </div>

          {/* Theme preview cards */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`rounded-xl border p-4 text-left transition ${
                !isDark
                  ? 'border-teal-400 ring-2 ring-teal-400/40'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="h-10 w-full rounded-lg bg-linear-to-b from-white via-teal-50 to-teal-100" />
              <p className={`mt-2 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Light</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>White &amp; teal</p>
            </button>

            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`rounded-xl border p-4 text-left transition ${
                isDark
                  ? 'border-teal-500 ring-2 ring-teal-500/40'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="h-10 w-full rounded-lg bg-linear-to-b from-slate-900 via-slate-800 to-slate-700" />
              <p className={`mt-2 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Dark</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Grey &amp; teal</p>
            </button>
          </div>
        </div>

        <div className={`mt-6 rounded-2xl border p-6 ${isDark ? 'border-slate-600 bg-slate-800/60' : 'border-teal-200 bg-white/60'}`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Chat</h2>

          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor="chat-language" className={`text-sm font-medium ${isDark ? 'text-teal-100' : 'text-teal-900'}`}>
              Response language
            </label>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              New responses will be generated in your selected language.
            </p>

            <select
              id="chat-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                isDark
                  ? 'border-slate-600 bg-slate-900 text-slate-100 focus:border-teal-500'
                  : 'border-teal-200 bg-white text-slate-800 focus:border-teal-500'
              }`}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
