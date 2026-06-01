'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/**
 * Tema claro/escuro.
 *
 * A classe `dark` é aplicada no <html> por um script anti-flash no
 * layout raiz (antes do paint), lendo localStorage. Aqui apenas
 * sincronizamos o estado React e persistimos as trocas.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  // Sincroniza o estado com a classe já aplicada pelo script anti-flash
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setThemeState(isDark ? 'dark' : 'light')
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem('theme', t) } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('theme', next) } catch { /* ignore */ }
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}
