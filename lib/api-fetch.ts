/**
 * Wrappers de fetch que automaticamente anexam o ID Token do Firebase Auth
 * no header `Authorization: Bearer <token>`.
 *
 * Usados pelos hooks SWR e por chamadas de mutation (POST/PATCH/DELETE).
 */
import { auth } from './firebase-client'

async function getToken(): Promise<string | null> {
  const u = auth.currentUser
  if (!u) return null
  try {
    return await u.getIdToken()
  } catch {
    return null
  }
}

/** Fetch genérico com Bearer token. Aceita os mesmos parâmetros do fetch nativo. */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getToken()
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

/** SWR fetcher — passe direto como segundo argumento de useSWR */
export const apiFetcher = async (url: string) => {
  const res = await apiFetch(url)
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || `Erro ${res.status}`)
  }
  return res.json()
}
