import useSWR from 'swr'
import type { Project } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'
import { useAuth } from '@/contexts/AuthContext'

export function useProjects() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ projects: Project[] }>(
    user ? '/api/projects' : null,
    apiFetcher,
    { refreshInterval: 600000, revalidateOnFocus: false }
  )

  const projects = (data?.projects ?? []).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  )

  const addProject = async (nome: string): Promise<Project> => {
    const res = await apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao criar projeto')
    await mutate()
    return json.project
  }

  const updateProject = async (id: string, nome: string): Promise<Project> => {
    const res = await apiFetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao atualizar projeto')
    await mutate()
    return json.project
  }

  const deleteProject = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir projeto')
    }
    await mutate()
  }

  return { projects, isLoading, error, mutate, addProject, updateProject, deleteProject }
}
