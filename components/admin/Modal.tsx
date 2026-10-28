'use client'

import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void | boolean | Promise<void | boolean>
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  closeOnConfirm?: boolean
}

/** 后台确认弹窗：调用方式沿用旧的 Modal，样式换成 coss 的 AlertDialog。 */
export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
  closeOnConfirm = true,
}: ModalProps) {
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) setSubmitting(false)
  }, [isOpen])

  async function handleConfirm() {
    if (!onConfirm || submitting) return
    setSubmitting(true)
    try {
      const result = await onConfirm()
      if (result !== false && closeOnConfirm) onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open && !submitting) onClose() }}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter variant="bare">
          <Button variant="outline" disabled={submitting} onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={type === 'danger' ? 'destructive' : 'default'} loading={submitting} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
