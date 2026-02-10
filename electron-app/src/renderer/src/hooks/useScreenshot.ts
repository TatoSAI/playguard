import { useState, useEffect } from 'react'

/**
 * Custom hook to load screenshots from file paths or base64
 * Handles backward compatibility with old base64 format
 *
 * @param screenshotPath - Relative path to screenshot file (NEW format)
 * @param screenshotBase64 - Base64 screenshot data (OLD format, fallback)
 * @returns Loading state and screenshot data URI
 */
export function useScreenshot(
  screenshotPath?: string,
  screenshotBase64?: string
): { loading: boolean; screenshot: string | null; error: string | null } {
  const [loading, setLoading] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadScreenshot = async () => {
      // Priority 1: Load from file path (NEW format)
      if (screenshotPath) {
        setLoading(true)
        setError(null)

        try {
          const result = await window.api.screenshot.load(screenshotPath)

          if (cancelled) return

          if (result.success) {
            setScreenshot(result.data)
          } else {
            console.error(`[useScreenshot] Failed to load: ${screenshotPath}`, result.error)
            setError(result.error || 'Failed to load screenshot')

            // Fallback to base64 if file load fails and base64 is available
            if (screenshotBase64) {
              const dataUri = screenshotBase64.startsWith('data:')
                ? screenshotBase64
                : `data:image/png;base64,${screenshotBase64}`
              setScreenshot(dataUri)
              setError(null) // Clear error since fallback worked
            }
          }
        } catch (err) {
          if (cancelled) return

          console.error('[useScreenshot] Load error:', err)
          setError(String(err))

          // Fallback to base64
          if (screenshotBase64) {
            const dataUri = screenshotBase64.startsWith('data:')
              ? screenshotBase64
              : `data:image/png;base64,${screenshotBase64}`
            setScreenshot(dataUri)
            setError(null)
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }
      // Priority 2: Use base64 directly (OLD format, fallback)
      else if (screenshotBase64) {
        const dataUri = screenshotBase64.startsWith('data:')
          ? screenshotBase64
          : `data:image/png;base64,${screenshotBase64}`
        setScreenshot(dataUri)
        setLoading(false)
      }
      // No screenshot available
      else {
        setScreenshot(null)
        setLoading(false)
      }
    }

    loadScreenshot()

    return () => {
      cancelled = true
    }
  }, [screenshotPath, screenshotBase64])

  return { loading, screenshot, error }
}

/**
 * Hook to load multiple screenshots at once
 * Useful for loading all step screenshots in a test
 *
 * @param steps - Array of step objects with screenshotPath or screenshot
 * @returns Array of { loading, screenshot, error } for each step
 */
export function useScreenshots(
  steps: Array<{ screenshotPath?: string; screenshot?: string }>
): Array<{ loading: boolean; screenshot: string | null; error: string | null }> {
  const [results, setResults] = useState<
    Array<{ loading: boolean; screenshot: string | null; error: string | null }>
  >(steps.map(() => ({ loading: true, screenshot: null, error: null })))

  useEffect(() => {
    let cancelled = false

    const loadAllScreenshots = async () => {
      const loadPromises = steps.map(async (step, index) => {
        // Load from file path
        if (step.screenshotPath) {
          try {
            const result = await window.api.screenshot.load(step.screenshotPath)

            if (result.success) {
              return { loading: false, screenshot: result.data, error: null }
            } else {
              // Fallback to base64
              if (step.screenshot) {
                const dataUri = step.screenshot.startsWith('data:')
                  ? step.screenshot
                  : `data:image/png;base64,${step.screenshot}`
                return { loading: false, screenshot: dataUri, error: null }
              }

              return { loading: false, screenshot: null, error: result.error || 'Failed to load' }
            }
          } catch (err) {
            // Fallback to base64
            if (step.screenshot) {
              const dataUri = step.screenshot.startsWith('data:')
                ? step.screenshot
                : `data:image/png;base64,${step.screenshot}`
              return { loading: false, screenshot: dataUri, error: null }
            }

            return { loading: false, screenshot: null, error: String(err) }
          }
        }
        // Use base64 directly
        else if (step.screenshot) {
          const dataUri = step.screenshot.startsWith('data:')
            ? step.screenshot
            : `data:image/png;base64,${step.screenshot}`
          return { loading: false, screenshot: dataUri, error: null }
        }
        // No screenshot
        else {
          return { loading: false, screenshot: null, error: null }
        }
      })

      const loadedResults = await Promise.all(loadPromises)

      if (!cancelled) {
        setResults(loadedResults)
      }
    }

    loadAllScreenshots()

    return () => {
      cancelled = true
    }
  }, [steps])

  return results
}
