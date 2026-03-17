import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({ open, onClose, title, children }) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-surface border-t border-border rounded-t-xl w-full max-h-[70vh] flex flex-col shadow-2xl animate-slide-up">
        {/* Handle + header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-1 bg-border rounded-full absolute top-2.5 left-1/2 -translate-x-1/2" />
            <h2 className="font-semibold text-text-primary">{title}</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
