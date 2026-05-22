import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    const snap = await adminDb.collection('tasks').doc(id)
      .collection('history').orderBy('criado_em', 'desc').get()
    if (snap.empty) return NextResponse.json({ history: [] })

    // Popula `usuario` para cada entrada
    const userIds = Array.from(new Set(snap.docs.map(d => (d.data() as any).usuario_id).filter(Boolean)))
    const userDocs = await Promise.all(userIds.map(uid => adminDb.collection('users').doc(uid).get()))
    const userMap = new Map<string, any>()
    userDocs.forEach(d => { if (d.exists) userMap.set(d.id, d.data()) })

    const history = snap.docs.map(d => {
      const data = d.data() as any
      const u = userMap.get(data.usuario_id)
      return {
        id: d.id,
        ...data,
        usuario: u ? { nome: u.nome, avatar_color: u.avatar_color } : null,
      }
    })

    return NextResponse.json({ history })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao buscar histórico', detail: e.message }, { status: 500 })
  }
}
