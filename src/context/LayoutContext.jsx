import { createContext, useContext, useState } from 'react'

const LayoutContext = createContext({ compact: false, toggleCompact: () => {} })

export function LayoutProvider({ children }) {
  const [compact, setCompact] = useState(() => localStorage.getItem('layout') === 'compact')

  function toggleCompact() {
    setCompact(c => {
      const next = !c
      localStorage.setItem('layout', next ? 'compact' : 'normal')
      return next
    })
  }

  return (
    <LayoutContext.Provider value={{ compact, toggleCompact }}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  return useContext(LayoutContext)
}
