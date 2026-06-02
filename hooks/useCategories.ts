import useSWR from 'swr'
import type { Category } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'
import { useAuth } from '@/contexts/AuthContext'

export function useCategories() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ categories: Category[] }>(
    user ? '/api/categories' : null,
    apiFetcher,
    { refreshInterval: 600000, revalidateOnFocus: false }
  )

  const categories = (data?.categories ?? []).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  )

  const addCategory = async (nome: string): Promise<Category> => {
    const res = await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao criar categoria')
    await mutate()
    return json.category
  }

  const updateCategory = async (id: string, nome: string): Promise<Category> => {
    const res = await apiFetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao atualizar categoria')
    await mutate()
    return json.category
  }

  const deleteCategory = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir categoria')
    }
    await mutate()
  }

  return { categories, isLoading, error, mutate, addCategory, updateCategory, deleteCategory }
}
