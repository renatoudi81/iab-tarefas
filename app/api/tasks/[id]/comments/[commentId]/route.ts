import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string; commentId: string }> }

export async function DELETE(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, commentId } = await params
  const userId = authUser.uid
  const perfil = authUser.perfil

  try {
    const ref = adminDb.collection('tasks').doc(id).collection('comments').doc(commentId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 })

    if (perfil !== 'Administrador' && (snap.data() as any).usuario_id !== userId) {
      return NextResponse.json({ error: 'Sem permissão para excluir este comentário' }, { status: 403 })
    }

    await ref.delete()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[comment DELETE]', e)
    return NextResponse.json({ error: 'Erro ao excluir comentário' }, { status: 500 })
  }
}
