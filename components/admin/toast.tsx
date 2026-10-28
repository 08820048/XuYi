'use client'

import { toastManager, ToastProvider } from '@/components/ui/toast'

/** 与旧的 useToast 保持同样的调用方式（success / error / warning / info），底层换成 coss 的 Toast。 */
function show(type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) {
  toastManager.add({ title: message, type, timeout: duration ?? 3000 })
}

const api = {
  success: (message: string, duration?: number) => show('success', message, duration),
  error: (message: string, duration?: number) => show('error', message, duration),
  warning: (message: string, duration?: number) => show('warning', message, duration),
  info: (message: string, duration?: number) => show('info', message, duration),
}

export function useToast() {
  return api
}

export { ToastProvider as AdminToastProvider }
