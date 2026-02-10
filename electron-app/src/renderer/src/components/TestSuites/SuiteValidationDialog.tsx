/**
 * Suite Validation Dialog Component
 *
 * Displays dependency validation results for a test suite
 * with auto-fix options for common issues
 */

import { useState, useEffect } from 'react'
import { X, AlertTriangle, XCircle, CheckCircle2, RefreshCw, Plus, ArrowUpDown } from 'lucide-react'
import { useToast } from '../Common/ToastProvider'

interface DependencyIssue {
  type: string
  severity: 'error' | 'warning'
  message: string
  affectedTestCaseIds: string[]
  suggestedFix?: {
    type: string
    description: string
    autoApplicable: boolean
    data?: any
  }
}

interface ValidationResult {
  valid: boolean
  issues: DependencyIssue[]
  executionOrder?: string[]
}

interface Props {
  suiteId: string
  suiteName: string
  onClose: () => void
  onFixApplied: () => void
}

export function SuiteValidationDialog({ suiteId, suiteName, onClose, onFixApplied }: Props) {
  const { toast } = useToast()
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isApplyingFix, setIsApplyingFix] = useState(false)

  useEffect(() => {
    validateSuite()
  }, [suiteId])

  const validateSuite = async () => {
    setIsValidating(true)
    try {
      const result = await window.api.prerequisites.validateSuite(suiteId)
      if (result.success && result.result) {
        setValidationResult(result.result)
      } else {
        toast.error('Failed to validate suite')
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast.error('Validation failed')
    } finally {
      setIsValidating(false)
    }
  }

  const applyAutoFix = async (issue: DependencyIssue) => {
    if (!issue.suggestedFix || !issue.suggestedFix.autoApplicable) {
      return
    }

    setIsApplyingFix(true)
    try {
      let result

      switch (issue.suggestedFix.type) {
        case 'add_to_suite':
          result = await window.api.prerequisites.autoFixDependencies(suiteId, 'add_missing')
          break

        case 'reorder_suite':
          result = await window.api.prerequisites.autoFixDependencies(suiteId, 'reorder')
          break

        default:
          toast.info('This fix type is not yet implemented')
          return
      }

      if (result.success) {
        toast.success('Fix applied successfully!', 'Auto-Fix')
        // Re-validate to see updated state
        await validateSuite()
        onFixApplied()
      } else {
        toast.error(result.error || 'Failed to apply fix')
      }
    } catch (error) {
      console.error('Auto-fix error:', error)
      toast.error('Failed to apply fix')
    } finally {
      setIsApplyingFix(false)
    }
  }

  const getIssueIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? XCircle : AlertTriangle
  }

  const getIssueColor = (severity: 'error' | 'warning') => {
    return severity === 'error'
      ? 'text-destructive border-destructive/30 bg-destructive/10'
      : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
  }

  const getFixIcon = (fixType: string) => {
    switch (fixType) {
      case 'add_to_suite':
        return Plus
      case 'reorder_suite':
        return ArrowUpDown
      case 'remove_dependency':
        return X
      case 'enable_prerequisite':
        return CheckCircle2
      default:
        return RefreshCw
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Suite Validation</h3>
            <p className="text-sm text-muted-foreground mt-1">{suiteName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isValidating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Validating dependencies...</p>
            </div>
          ) : validationResult?.valid ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">All Good!</h4>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                No dependency issues found. This suite is ready to run.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-semibold text-foreground">
                    Found {validationResult?.issues.length} issue(s)
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  The following dependency issues were detected. Click on the suggested fixes to resolve them automatically.
                </p>
              </div>

              {/* Issues List */}
              {validationResult?.issues.map((issue, index) => {
                const Icon = getIssueIcon(issue.severity)
                const FixIcon = issue.suggestedFix ? getFixIcon(issue.suggestedFix.type) : null

                return (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${getIssueColor(issue.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {/* Issue Message */}
                        <p className="text-sm font-medium text-foreground mb-1">
                          {issue.message}
                        </p>

                        {/* Issue Type Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs px-2 py-0.5 bg-background/50 rounded">
                            {issue.type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {issue.affectedTestCaseIds.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Affects {issue.affectedTestCaseIds.length} test(s)
                            </span>
                          )}
                        </div>

                        {/* Suggested Fix */}
                        {issue.suggestedFix && (
                          <div className="mt-3 pt-3 border-t border-current/20">
                            <p className="text-xs text-muted-foreground mb-2">
                              Suggested Fix:
                            </p>
                            {issue.suggestedFix.autoApplicable ? (
                              <button
                                onClick={() => applyAutoFix(issue)}
                                disabled={isApplyingFix}
                                className="flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-background/80 border border-current/30 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {FixIcon && <FixIcon className="w-4 h-4" />}
                                <span>{issue.suggestedFix.description}</span>
                                {isApplyingFix && (
                                  <RefreshCw className="w-3 h-3 animate-spin ml-auto" />
                                )}
                              </button>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                {issue.suggestedFix.description} (Manual action required)
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Execution Order Preview */}
              {validationResult?.executionOrder && (
                <div className="p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpDown className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Suggested Execution Order
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tests should be executed in this order to satisfy dependencies:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.executionOrder.map((testId, index) => (
                      <div key={testId} className="flex items-center gap-1.5">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {index + 1}. {testId}
                        </span>
                        {index < validationResult.executionOrder!.length - 1 && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <button
            onClick={validateSuite}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            Re-validate
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
