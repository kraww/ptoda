import { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 1800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
        {message}
      </div>
    </div>
  )
}
