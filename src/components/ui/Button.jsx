export default function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, className = '', type = 'button'
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]'

  const variants = {
    primary:   'bg-accent hover:bg-accent-hover text-white',
    secondary: 'bg-card hover:bg-hover text-text-primary border border-border',
    ghost:     'bg-transparent hover:bg-hover text-text-secondary hover:text-text-primary',
    danger:    'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
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
