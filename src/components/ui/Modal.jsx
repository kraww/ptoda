export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="font-semibold text-lg">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
