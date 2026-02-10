import { useState, useEffect, useRef } from 'react'

interface ExecutionStep {
  stepIndex: number
  description: string
  status: 'running' | 'passed' | 'failed' | 'error'
  startTime: number
  duration?: number
  error?: string
}

interface ExecutionState {
  isRunning: boolean
  currentTestId: string | null
  currentTestName: string | null
  currentTestIndex: number
  totalTests: number
  currentStepIndex: number
  totalSteps: number
  completedSteps: ExecutionStep[]
  currentStep: ExecutionStep | null
  startTime: number
  suiteName: string | null
}

/**
 * Hook to poll test execution state in real-time
 * @param enabled - Whether polling should be active
 * @param interval - Polling interval in milliseconds (default: 500ms)
 */
export function useTestExecutionPolling(enabled: boolean, interval: number = 500) {
  const [state, setState] = useState<ExecutionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      // Clear polling when disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setState(null)
      setError(null)
      return
    }

    // Start polling
    const poll = async () => {
      try {
        const result = await window.api.test.getExecutionState()

        if (result.success && result.state) {
          setState(result.state)
          setError(null)
        } else {
          setError('Failed to get execution state')
        }
      } catch (err) {
        console.error('[useTestExecutionPolling] Error:', err)
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    // Poll immediately
    poll()

    // Set up interval
    intervalRef.current = setInterval(poll, interval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval])

  return { state, error }
}
