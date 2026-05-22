import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

async function attachUser(comment: any, userMap: Map<string, any>) {
  const u = userMap.get(comment.usuario_id)
  return { ...comment, usuario: u ? { nome: u.nome, avatar_color: u.avatar_color } : null }
}

export async function GET(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    const snap = await adminDb.collection('tasks').doc(id)
      .collection('comments').orderBy('criado_em', 'asc').get()
    if (snap.empty) return NextResponse.json({ comments: [] })

    // Carrega usuários referenciados para popular `usuario`
    const userIds = Array.from(new Set(snap.docs.map(d => (d.data() as any).usuario_id).filter(Boolean)))
    const userDocs = await Promise.all(userIds.map(uid => adminDb.collection('users').doc(uid).get()))
    const userMap = new Map<string, any>()
    userDocs.forEach(d => { if (d.exists) userMap.set(d.id, d.data()) })

    const comments = await Promise.all(snap.docs.map(d =>
      attachUser({ id: d.id, ...d.data() }, userMap)
    ))
    return NextResponse.json({ comments })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao buscar comentários', detail: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const userId = authUser.uid

  try {
    const body = await req.json()
    const { texto } = body
    if (!texto?.trim()) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })

    const taskRef = adminDb.collection('tasks').doc(id)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    const task = taskSnap.data() as any

    const now = new Date().toISOString()
    const commentData = {
      tarefa_id: id,
      usuario_id: userId,
      texto: texto.trim(),
      criado_em: now,
      editado_em: now,
    }
    const ref = await taskRef.collection('comments').add(commentData)

    // Notifica responsável se não for o próprio autor
    if (task.responsavel_id && task.responsavel_id !== userId) {
      await adminDb.collection('notifications').add({
        usuario_id: task.responsavel_id,
        tarefa_id: id,
        tipo: 'comentario',
        titulo: 'Novo comentário',
        mensagem: `Novo comentário na tarefa "${task.titulo}"`,
        lida: false,
        criado_em: now,
      })
    }

    // Popula usuario para a resposta
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const u = userDoc.exists ? userDoc.data() as any : null
    const comment = {
      id: ref.id,
      ...commentData,
      usuario: u ? { nome: u.nome, avatar_color: u.avatar_color } : null,
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao criar comentário', detail: e.message }, { status: 500 })
  }
}
