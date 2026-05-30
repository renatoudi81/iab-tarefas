import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem editar projetos' }, { status: 403 })
  }

  const { id } = await params
  const { nome } = await req.json()
  const nomeTrim = nome?.trim()
  if (!nomeTrim) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const ref = adminDb.collection('projects').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const dup = await adminDb.collection('projects').where('nome', '==', nomeTrim).limit(2).get()
  if (dup.docs.some(d => d.id !== id)) {
    return NextResponse.json({ error: 'Já existe outro projeto com esse nome' }, { status: 409 })
  }

  await ref.update({ nome: nomeTrim })
  const updated = await ref.get()
  return NextResponse.json({ project: { id: updated.id, ...updated.data() } })
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem excluir projetos' }, { status: 403 })
  }

  const { id } = await params
  const ref = adminDb.collection('projects').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  // Bloqueia exclusão se houver tarefas vinculadas
  const tarefas = await adminDb.collection('tasks').where('projeto_id', '==', id).limit(50).get()
  if (!tarefas.empty) {
    const n = tarefas.size
    return NextResponse.json({
      error: `Não é possível excluir: ${n} tarefa${n !== 1 ? 's' : ''} usa${n !== 1 ? 'm' : ''} este projeto`
    }, { status: 409 })
  }

  await ref.delete()
  return NextResponse.json({ ok: true })
}
