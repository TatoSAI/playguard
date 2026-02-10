/**
 * CreateTestCase Component
 * Multi-modal test case creation hub
 * Supports: Recording, Scripting, Import/Transform, AI Generation
 */

import { useState } from 'react'
import { ModeSelector, CreationMode } from './ModeSelector'
import { ScriptingMode } from './modes/ScriptingMode'
import TestRecorder from '../TestRecorder/TestRecorder'

export default function CreateTestCase(): JSX.Element {
  const [selectedMode, setSelectedMode] = useState<CreationMode>('record')

  const handleModeChange = (mode: CreationMode) => {
    setSelectedMode(mode)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mode Selector */}
      <ModeSelector selectedMode={selectedMode} onModeChange={handleModeChange} />

      {/* Mode Content */}
      <div className="flex-1 overflow-hidden">
        {selectedMode === 'record' && <TestRecorder />}

        {selectedMode === 'script' && <ScriptingMode />}

        {selectedMode === 'import' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Import Mode</h2>
              <p className="text-muted-foreground">
                Import and transform external test formats
              </p>
              <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
            </div>
          </div>
        )}

        {selectedMode === 'ai' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">AI Generation Mode</h2>
              <p className="text-muted-foreground">
                Generate test cases from natural language descriptions
              </p>
              <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
