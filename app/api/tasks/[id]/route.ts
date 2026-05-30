import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

const TRACKED_FIELDS = ['titulo', 'status', 'prioridade', 'responsavel_id', 'data_prazo'] as const

const ALLOWED_UPDATE_FIELDS = [
  'titulo', 'descricao', 'observacoes', 'projeto_id', 'categoria', 'prioridade', 'status',
  'responsavel_id', 'equipe', 'data_inicio', 'data_prazo', 'data_conclusao',
  'tempo_estimado', 'tempo_gasto_total', 'tags', 'anexos',
  'aguardando_quem', 'data_retorno_esperada',
] as const

const VALID_PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'] as const
const VALID_STATUSES = ['Pendente', 'Em andamento', 'Concluída', 'Atrasada', 'Aguardando'] as const

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  let body: Record<string, any>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const ref = adminDb.collection('tasks').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const existing = snap.data() as any
  const userId = authUser.uid
  const isAdmin = authUser.perfil === 'Administrador'
  const isResponsavel = existing.responsavel_id === userId
  const isEquipe = Array.isArray(existing.equipe) && existing.equipe.includes(userId)

  if (!isAdmin && !isResponsavel && !isEquipe) {
    return NextResponse.json({ error: 'Sem permissão para editar esta tarefa' }, { status: 403 })
  }

  // Enums
  if (body.prioridade !== undefined && !VALID_PRIORIDADES.includes(body.prioridade)) {
    return NextResponse.json({ error: 'Prioridade inválida' }, { status: 400 })
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  // Whitelist
  const data: Record<string, any> = {}
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (field in body) data[field] = body[field]
  }

  if (body.status === 'Concluída' && !existing.data_conclusao) {
    data.data_conclusao = new Date().toISOString().split('T')[0]
  }
  if (body.tempo_estimado !== undefined) data.tempo_estimado = Number(body.tempo_estimado)
  if (body.tempo_gasto_total !== undefined) data.tempo_gasto_total = Number(body.tempo_gasto_total)

  data.atualizado_em = new Date().toISOString()

  await ref.update(data)

  // Histórico — entradas só para campos rastreados que mudaram
  const historyEntries = TRACKED_FIELDS
    .filter(field => body[field] !== undefined && String(body[field]) !== String(existing[field]))
    .map(field => ({
      tarefa_id: id,
      usuario_id: userId,
      campo: field,
      valor_ant: String(existing[field] ?? ''),
      valor_novo: String(body[field] ?? ''),
      criado_em: new Date().toISOString(),
    }))

  if (historyEntries.length > 0) {
    const batch = adminDb.batch()
    for (const h of historyEntries) {
      batch.set(ref.collection('history').doc(), h)
    }
    await batch.commit()
  }

  // Notifica responsável se status mudou
  if (body.status !== undefined && body.status !== existing.status) {
    const responsavelId = (body.responsavel_id as string | null | undefined) ?? existing.responsavel_id
    if (responsavelId && responsavelId !== userId) {
      await adminDb.collection('notifications').add({
        usuario_id: responsavelId,
        tarefa_id: id,
        tipo: 'status_alterado',
        titulo: 'Status alterado',
        mensagem: `"${existing.titulo}" → ${body.status}`,
        lida: false,
        criado_em: new Date().toISOString(),
      })
    }
  }

  // Resposta com responsavel populado
  const updated = await ref.get()
  const updatedData = updated.data() as any
  let responsavel = null
  if (updatedData.responsavel_id) {
    const userDoc = await adminDb.collection('users').doc(updatedData.responsavel_id).get()
    if (userDoc.exists) {
      const u = userDoc.data() as any
      responsavel = { id: userDoc.id, nome: u.nome, avatar_color: u.avatar_color, avatar_url: u.avatar_url ?? null }
    }
  }

  // Mesma derivação aplicada no GET — status='Atrasada' quando vencida
  // e não-concluída. Garante consistência entre POST/PATCH e GET; o user
  // não vê a tarefa "saltar" entre status diferentes após cada operação.
  const today = new Date().toISOString().split('T')[0]
  const isOverdue =
    updatedData.data_prazo &&
    updatedData.data_prazo < today &&
    updatedData.status !== 'Concluída'
  const effectiveStatus = isOverdue ? 'Atrasada' : updatedData.status

  return NextResponse.json({
    task: { id: updated.id, ...updatedData, status: effectiveStatus, responsavel },
  })
}

export async function DELETE(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const perfil = authUser.perfil
  const userId = authUser.uid

  const ref = adminDb.collection('tasks').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  if (perfil !== 'Administrador') {
    if ((snap.data() as any).responsavel_id !== userId) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta tarefa' }, { status: 403 })
    }
  }

  // Deleta subcoleções (Firestore não faz cascade automático)
  const subcollections = ['subtasks', 'comments', 'time_entries', 'history'] as const
  for (const sub of subcollections) {
    const subSnap = await ref.collection(sub).get()
    if (subSnap.empty) continue
    let batch = adminDb.batch()
    let count = 0
    for (const doc of subSnap.docs) {
      batch.delete(doc.ref)
      count++
      if (count >= 400) { await batch.commit(); batch = adminDb.batch(); count = 0 }
    }
    if (count > 0) await batch.commit()
  }

  await ref.delete()
  return NextResponse.json({ ok: true })
}
