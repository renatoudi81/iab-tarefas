'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * useState que PERSISTE o valor em localStorage sob `key`.
 *
 * Usado para manter a seleção de filtros (Lista, Kanban) entre navegações e
 * reloads — a seleção só some quando o usuário a redefine (ex.: "Limpar
 * filtros", que volta os estados ao default).
 *
 * SSR-safe: o primeiro render usa `initial` (idêntico no servidor e no
 * cliente, evitando hydration mismatch); o valor salvo é aplicado logo após o
 * mount. A gravação é pulada até a hidratação, pra não sobrescrever o valor
 * salvo com o `initial`. Enquanto nada for salvo (sem interação), a chave nem
 * é criada.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const skipSave = useRef(true)

  // Hidrata do localStorage uma vez, após o mount (lado cliente).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {
      /* localStorage indisponível ou JSON inválido — mantém o initial */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Persiste a cada mudança, exceto no primeiro disparo (ainda pré-hidratação).
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignora falha de escrita (quota, modo privado, etc.) */
    }
  }, [key, value])

  return [value, setValue] as const
}
