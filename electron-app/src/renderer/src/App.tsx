import { useState } from 'react'
import { Smartphone, Play, FolderKanban, BarChart3, PenSquare, Zap, Settings } from 'lucide-react'
import DeviceManager from './components/DeviceManager/DeviceManager'
import TestRunner from './components/TestRunner/TestRunner'
import CreateTestCase from './components/CreateTestCase/CreateTestCase'
import AdHocTesting from './components/AdHocTesting/AdHocTesting'
import TestSuites from './components/TestSuites/TestSuites'
import ReportViewer from './components/ReportViewer/ReportViewer'
import { ToastProvider } from './components/Common/ToastProvider'
import SettingsDialog from './components/Settings/SettingsDialog'

type Tab = 'devices' | 'create' | 'adhoc' | 'runner' | 'suites' | 'reports'

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('devices')
  const [highlightExecutionId, setHighlightExecutionId] = useState<string | null>(null)

  const tabs = [
    { id: 'devices' as Tab, label: 'Devices', icon: Smartphone },
    { id: 'create' as Tab, label: 'Create', icon: PenSquare },
    { id: 'adhoc' as Tab, label: 'Ad-Hoc Testing', icon: Zap },
    { id: 'runner' as Tab, label: 'Test Runner', icon: Play },
    { id: 'suites' as Tab, label: 'Test Suites', icon: FolderKanban },
    { id: 'reports' as Tab, label: 'Reports', icon: BarChart3 }
  ]

  const [showSettings, setShowSettings] = useState(false)

  const handleNavigateToReports = (executionId?: string) => {
    setActiveTab('reports')
    if (executionId) {
      setHighlightExecutionId(executionId)
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightExecutionId(null), 3000)
    }
  }

  return (
    <ToastProvider>
      <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10">
              <svg viewBox="0 0 256 256" className="w-10 h-10">
                <circle cx="128" cy="132" r="115" fill="#1E40AF"/>
                <circle cx="128" cy="128" r="115" fill="#2563EB"/>
                <circle cx="128" cy="124" r="115" fill="#3B82F6"/>
                <circle cx="128" cy="120" r="105" fill="#60A5FA"/>
                <circle cx="128" cy="116" r="95" fill="#93C5FD"/>
                <path d="M 85 80 L 85 160 L 190 120 Z" fill="#FFFFFF"/>
                <path d="M 75 120 L 55 115 L 55 125 Z" fill="#FCD34D"/>
                <path d="M 75 120 L 55 115 L 60 120 Z" fill="#FDE68A"/>
                <path d="M 75 120 L 55 125 L 60 120 Z" fill="#FEF3C7"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">PlayGuard</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Game Testing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
              v2.0.0-alpha
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-1 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium
                  transition-colors relative
                  ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'devices' && <DeviceManager />}
        {activeTab === 'create' && <CreateTestCase />}
        {activeTab === 'adhoc' && <AdHocTesting />}
        {activeTab === 'runner' && <TestRunner onNavigateToReports={handleNavigateToReports} />}
        {activeTab === 'suites' && <TestSuites />}
        {activeTab === 'reports' && <ReportViewer highlightExecutionId={highlightExecutionId} />}
      </main>

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </div>
    </ToastProvider>
  )
}

export default App
