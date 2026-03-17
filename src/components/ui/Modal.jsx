import { X } from 'lucide-react'

export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="bg-surface border border-border rounded-lg w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-base text-text-primary">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
