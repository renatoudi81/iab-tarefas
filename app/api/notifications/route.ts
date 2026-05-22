import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const userId = user.uid

  try {
    // Usa o índice composto (usuario_id ASC + criado_em DESC) já publicado
    const snap = await adminDb.collection('notifications')
      .where('usuario_id', '==', userId)
      .orderBy('criado_em', 'desc')
      .limit(50)
      .get()

    const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

    // Ordenação secundária em memória: não lidas primeiro (mantém criado_em desc dentro de cada grupo)
    all.sort((a, b) => {
      if (a.lida !== b.lida) return a.lida ? 1 : -1
      return 0
    })

    return NextResponse.json({ notifications: all.slice(0, 20) })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao buscar notificações', detail: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const userId = user.uid

  try {
    const body = await req.json()

    if (body.all === true) {
      // Marca todas as não lidas como lidas (lotes de 400 — limite do batch)
      const snap = await adminDb.collection('notifications')
        .where('usuario_id', '==', userId)
        .where('lida', '==', false)
        .get()

      let batch = adminDb.batch()
      let count = 0
      for (const doc of snap.docs) {
        batch.update(doc.ref, { lida: true })
        count++
        if (count >= 400) { await batch.commit(); batch = adminDb.batch(); count = 0 }
      }
      if (count > 0) await batch.commit()
      return NextResponse.json({ ok: true })
    }

    if (body.id) {
      const ref = adminDb.collection('notifications').doc(body.id)
      const doc = await ref.get()
      if (!doc.exists) return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })
      if ((doc.data() as any).usuario_id !== userId) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
      await ref.update({ lida: true })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao atualizar notificação', detail: e.message }, { status: 500 })
  }
}
