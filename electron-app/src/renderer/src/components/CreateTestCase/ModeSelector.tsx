/**
 * ModeSelector Component
 * Tab selector for switching between different test creation modes
 */

import { Circle, Code, Download, Sparkles } from 'lucide-react'

export type CreationMode = 'record' | 'script' | 'import' | 'ai'

interface Props {
  selectedMode: CreationMode
  onModeChange: (mode: CreationMode) => void
}

interface ModeTab {
  id: CreationMode
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const MODES: ModeTab[] = [
  {
    id: 'record',
    label: 'Record',
    icon: Circle,
    description: 'Record test from device interaction'
  },
  {
    id: 'script',
    label: 'Script',
    icon: Code,
    description: 'Write test using YAML scripting language'
  },
  {
    id: 'import',
    label: 'Import',
    icon: Download,
    description: 'Import and transform external test formats'
  },
  {
    id: 'ai',
    label: 'AI Generate',
    icon: Sparkles,
    description: 'Generate test from natural language description'
  }
]

export function ModeSelector({ selectedMode, onModeChange }: Props) {
  return (
    <div className="border-b border-border bg-card">
      <div className="flex gap-1 px-4 pt-4">
        {MODES.map((mode) => {
          const Icon = mode.icon
          const isActive = selectedMode === mode.id

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              title={mode.description}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all
                ${
                  isActive
                    ? 'bg-background text-foreground border-t border-l border-r border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
              style={isActive ? { marginBottom: '-1px' } : {}}
            >
              <Icon className="w-4 h-4" />
              <span>{mode.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
