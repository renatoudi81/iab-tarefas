'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase-client'

export interface AppUser {
  id: string          // uid (mesmo nome usado em session.user.id antes)
  email: string
  name: string        // displayName (nome)
  perfil: string
  avatar_color: string
  avatar_url: string | null
  ativo: boolean
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        // Carrega perfil estendido do Firestore (perfil, avatar_color, etc.)
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        if (!snap.exists()) {
          // Documento ausente — desloga para evitar estado inconsistente
          await fbSignOut(auth)
          setUser(null)
          return
        }
        const data = snap.data() as any
        if (data.ativo === false) {
          await fbSignOut(auth)
          setUser(null)
          return
        }
        setUser({
          id: fbUser.uid,
          email: fbUser.email || data.email,
          name: data.nome,
          perfil: data.perfil,
          avatar_color: data.avatar_color,
          avatar_url: data.avatar_url ?? null,
          ativo: data.ativo,
        })
      } catch (e) {
        console.error('Erro ao carregar perfil do usuário:', e)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    // Mantém loading=true durante o sign-in para evitar race condition:
    // entre signInWithEmailAndPassword resolver e o onAuthStateChanged
    // disparar (com fetch do doc Firestore), o layout poderia ver
    // user=null + loading=false e redirecionar pro /login indevidamente.
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // NÃO faz setLoading(false) aqui — deixa o listener fazer
      // após carregar o doc do usuário no Firestore.
    } catch (e) {
      setLoading(false)
      throw e
    }
  }

  const handleSignOut = async () => {
    await fbSignOut(auth)
    // onAuthStateChanged seta user=null
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn: handleSignIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
