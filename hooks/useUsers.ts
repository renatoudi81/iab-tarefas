import useSWR from 'swr'
import type { User } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase-client'

export interface AddUserPayload {
  nome: string
  email: string
  perfil: User['perfil']
  avatar_color?: string
  ativo?: boolean
  /** Se omitido, o usuário é criado sem senha e recebe e-mail de definição. */
  senha?: string
}

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<{ users: User[] }>(
    '/api/users',
    apiFetcher,
    { refreshInterval: 60000 }
  )

  const users = data?.users ?? []

  /**
   * Cria um usuário. Comportamento:
   * - Se `senha` for fornecida: cria com senha imediata; admin avisa o usuário.
   * - Se `senha` omitida: cria SEM senha e dispara automaticamente o e-mail
   *   de "definir senha" — o usuário define a sua própria senha pelo link.
   */
  const addUser = async (
    userData: AddUserPayload,
  ): Promise<{ user: User; passwordResetSent: boolean }> => {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao criar usuário')

    let passwordResetSent = false
    // Onboarding: sem senha → manda o e-mail pro usuário definir a senha dele
    if (!userData.senha) {
      try {
        await sendPasswordResetEmail(auth, userData.email.toLowerCase().trim(), {
          url: `${window.location.origin}/redefinir-senha`,
          handleCodeInApp: true,
        })
        passwordResetSent = true
      } catch (e) {
        // Não derruba a criação — admin pode usar o botão de reenviar depois
        console.warn('Falha ao enviar e-mail de definição de senha:', e)
      }
    }

    await mutate()
    return { user: json.user, passwordResetSent }
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
