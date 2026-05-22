import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem editar categorias' }, { status: 403 })
  }

  const { id } = await params
  const { nome } = await req.json()
  const nomeTrim = nome?.trim()
  if (!nomeTrim) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const ref = adminDb.collection('categories').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

  // Checa se OUTRA categoria já usa esse nome
  const dup = await adminDb.collection('categories').where('nome', '==', nomeTrim).limit(2).get()
  if (dup.docs.some(d => d.id !== id)) {
    return NextResponse.json({ error: 'Já existe outra categoria com esse nome' }, { status: 409 })
  }

  await ref.update({ nome: nomeTrim })
  const updated = await ref.get()
  return NextResponse.json({ category: { id: updated.id, ...updated.data() } })
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem excluir categorias' }, { status: 403 })
  }

  const { id } = await params
  const ref = adminDb.collection('categories').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

  const nome = (snap.data() as any).nome

  // Bloqueia exclusão se houver tarefas vinculadas
  const tarefas = await adminDb.collection('tasks').where('categoria', '==', nome).limit(50).get()
  if (!tarefas.empty) {
    const n = tarefas.size
    return NextResponse.json({
      error: `Não é possível excluir: ${n} tarefa${n !== 1 ? 's' : ''} usa${n !== 1 ? 'm' : ''} esta categoria`
    }, { status: 409 })
  }

  await ref.delete()
  return NextResponse.json({ ok: true })
}
