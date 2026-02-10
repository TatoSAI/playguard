/**
 * Toast hook adapter
 * Provides shadcn-compatible toast API using existing ToastProvider
 */

import { useToast as useToastContext } from '../components/Common/ToastProvider'

interface ToastOptions {
  title?: string
  description: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toastContext = useToastContext()

  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default' } = options

    if (variant === 'destructive') {
      toastContext.error(description, title)
    } else {
      toastContext.success(description, title)
    }
  }

  return { toast }
}
