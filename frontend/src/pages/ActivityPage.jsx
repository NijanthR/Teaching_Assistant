import { useTheme } from '../context/ThemeContext.jsx'

function ActivityPage() {
  const { t } = useTheme()
  return (
    <div className={`flex h-full w-full flex-col overflow-hidden ${t.pageBg}`}>
      <div className="flex h-full items-center justify-center text-sm text-teal-500">
        Activity
      </div>
    </div>
  )
}

export default ActivityPage
