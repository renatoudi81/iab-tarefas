import useSWR from 'swr'
import type { User } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<{ users: User[] }>(
    '/api/users',
    apiFetcher,
    { refreshInterval: 60000 }
  )

  const users = data?.users ?? []

  const addUser = async (userData: Omit<User, 'id' | 'criado_em'> & { senha: string }): Promise<User> => {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao criar usuário')
    await mutate()
    return json.user
  }

  const updateUser = async (id: string, updates: Partial<User & { nova_senha?: string }>): Promise<User> => {
    const res = await apiFetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao atualizar usuário')
    await mutate()
    return json.user
  }

  const deleteUser = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir usuário')
    }
    await mutate()
  }

  return { users, isLoading, error, mutate, addUser, updateUser, deleteUser }
}
