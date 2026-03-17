export default function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '', type = 'button' }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:  'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-900/40',
    secondary:'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    ghost:    'bg-transparent hover:bg-slate-800 text-slate-300',
    danger:   'bg-red-600 hover:bg-red-500 text-white',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}
