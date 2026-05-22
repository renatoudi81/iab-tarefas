/**
 * Verificação de ID Token do Firebase Auth para as API routes.
 * Substitui o `getServerSession(authOptions)` do NextAuth.
 *
 * Uso típico em uma route:
 *   const user = await verifyAuth(req)
 *   if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
 *   // user.uid, user.email, user.perfil, user.avatar_color etc.
 */
import { adminAuth, adminDb } from './firebase-admin'

export interface AuthUser {
  uid: string
  id: string  // alias de uid — compatibilidade com código que usava session.user.id
  email: string
  nome: string
  perfil: string
  avatar_color: string
  ativo: boolean
}

export async function verifyAuth(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return null

  const token = header.slice(7).trim()
  if (!token) return null

  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(token)
  } catch {
    return null
  }

  // Enriquece com dados do Firestore (perfil, avatar_color etc)
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get()
  if (!userDoc.exists) return null
  const data = userDoc.data() as any
  if (data.ativo === false) return null

  return {
    uid: decoded.uid,
    id: decoded.uid,
    email: decoded.email || data.email,
    nome: data.nome,
    perfil: data.perfil,
    avatar_color: data.avatar_color,
    ativo: data.ativo,
  }
}
