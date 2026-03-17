import { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 200) }, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
      <div className="bg-card border border-border text-text-primary text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl whitespace-nowrap">
        {message}
      </div>
    </div>
  )
}
