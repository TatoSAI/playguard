import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Toast, { ToastType } from './Toast'

interface ToastData {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const toast: ToastData = {
        id,
        type,
        title,
        message,
        duration
      }
      setToasts((prev) => [...prev, toast])
    },
    []
  )

  const success = useCallback((message: string, title?: string) => {
    showToast('success', message, title)
  }, [showToast])

  const error = useCallback((message: string, title?: string) => {
    showToast('error', message, title)
  }, [showToast])

  const warning = useCallback((message: string, title?: string) => {
    showToast('warning', message, title)
  }, [showToast])

  const info = useCallback((message: string, title?: string) => {
    showToast('info', message, title)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast Container - Fixed position at bottom right */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              id={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              duration={toast.duration}
              onClose={removeToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
