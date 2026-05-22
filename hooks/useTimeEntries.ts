import useSWR from 'swr'
import type { TimeEntry } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'
import { useAuth } from '@/contexts/AuthContext'

export interface NewTimeEntry {
  tarefa_id: string
  duracao: number
  tipo?: 'manual' | 'automatico'
  hora_inicio?: string
  hora_fim?: string
  data?: string
}

export function useTimeEntries() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ entries: TimeEntry[] }>(
    user ? '/api/time-entries' : null,
    apiFetcher,
    { refreshInterval: 30000 }
  )

  const entries = data?.entries ?? []

  const addTimeEntry = async (entryData: NewTimeEntry): Promise<TimeEntry> => {
    const res = await apiFetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao registrar tempo')
    await mutate()
    return json.entry
  }

  const deleteTimeEntry = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir lançamento')
    }
    await mutate()
  }

  return { entries, isLoading, error, mutate, addTimeEntry, deleteTimeEntry }
}
