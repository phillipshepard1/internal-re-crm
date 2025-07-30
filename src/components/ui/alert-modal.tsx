import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

export interface AlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string | React.ReactNode
  type?: 'success' | 'error' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  showCancel?: boolean
  disabled?: boolean
}

export function AlertModal({
  open,
  onOpenChange,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = false,
  disabled = false,
}: AlertModalProps) {
  const handleConfirm = () => {
    onConfirm?.()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getButtonVariant = () => {
    switch (type) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'warning':
        return 'outline'
      case 'info':
      default:
        return 'default'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </DialogTitle>
          {typeof message === 'string' ? (
            <DialogDescription className="text-left">
              {message}
            </DialogDescription>
          ) : (
            <div className="text-left text-sm text-muted-foreground">
              {message}
            </div>
          )}
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          {showCancel && (
            <Button variant="outline" onClick={handleCancel} disabled={disabled}>
              {cancelText}
            </Button>
          )}
          <Button variant={getButtonVariant()} onClick={handleConfirm} disabled={disabled}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 