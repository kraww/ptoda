import { useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'

export default function Drawer({ open, onClose, title, children, trigger }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Pull-up trigger tab — always visible at bottom */}
      {trigger}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 flex flex-col bg-surface border-t border-border rounded-t-xl shadow-2xl transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '70vh' }}
      >
        {/* Drag handle + header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-border rounded-full" />
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </>
  )
}
