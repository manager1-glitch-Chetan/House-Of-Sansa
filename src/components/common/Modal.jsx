import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cx } from '@/lib/utils'

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-6xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-hos-ink-950/50 p-4 pt-10 sm:pt-16">
      <div className={cx('w-full rounded-xl bg-white shadow-2xl', sizes[size])}>
        <div className="flex items-center justify-between border-b border-hos-ink-200 px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-hos-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-hos-ink-400 hover:bg-hos-ink-100 hover:text-hos-ink-700">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-hos-ink-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
