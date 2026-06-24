import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'
import { todayStr } from '@/types'

type Params = { params: Promise<{ id: string }> }

const TRACKED_FIELDS = ['titulo', 'status', 'prioridade', 'responsavel_id', 'data_prazo'] as const

const ALLOWED_UPDATE_FIELDS = [
  'titulo', 'descricao', 'observacoes', 'projeto_id', 'categoria', 'tipo_publico', 'canal', 'prioridade', 'status',
  'responsavel_id', 'equipe', 'data_inicio', 'data_prazo', 'data_conclusao',
  // tempo_gasto_total NÃO é editável aqui: é calculado pela soma dos
  // lançamentos de tempo (subcoleção time_entries). Única fonte de verdade.
  'tempo_estimado', 'tags', 'anexos',
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

  // 'Atrasada' é estado DERIVADO (prazo vencido + não concluída), nunca uma
  // intenção persistida. O GET devolve esse status efetivo, então o formulário
  // o herda e o reenvia no save — o que "congelava" Atrasada no banco e fazia
  // a tarefa continuar Atrasada mesmo após o prazo ser estendido. Descartamos
  // o campo: o status-base já gravado (Pendente/Em andamento/...) é preservado
  // e a derivação volta a calcular Atrasada só quando realmente vencida.
  if (body.status === 'Atrasada') delete body.status

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

  // Coerência de datas (mesma regra do POST): início não pode ser depois do
  // prazo. Compara os valores EFETIVOS pós-edição (body quando presente,
  // senão o que já está gravado) — antes essa validação só existia no POST
  // e a edição conseguia criar estado inválido.
  const effInicio = body.data_inicio !== undefined ? body.data_inicio : existing.data_inicio
  const effPrazo = body.data_prazo !== undefined ? body.data_prazo : existing.data_prazo
  if (effInicio && effPrazo && effInicio > effPrazo) {
    return NextResponse.json({ error: 'Data de início não pode ser posterior ao prazo' }, { status: 400 })
  }

  // Responsável é obrigatório — não pode ser removido em uma edição.
  // (Se o campo estiver no body e vier vazio/null, rejeita.)
  if (body.responsavel_id !== undefined) {
    const novoResp = body.responsavel_id
    if (!novoResp || typeof novoResp !== 'string' || !novoResp.trim()) {
      return NextResponse.json({ error: 'Responsável obrigatório' }, { status: 400 })
    }
    // Confere que o novo responsável existe (se mudou)
    if (novoResp !== existing.responsavel_id) {
      const respSnap = await adminDb.collection('users').doc(novoResp).get()
      if (!respSnap.exists) {
        return NextResponse.json({ error: 'Responsável não cadastrado' }, { status: 400 })
      }
    }
  }

  // Campos sensíveis (reatribuir tarefa / mudar equipe / projeto) só podem
  // ser alterados por admin ou pelo responsável atual — não por membro de
  // equipe (que poderia se promover ou sequestrar a tarefa).
  const SENSITIVE_FIELDS = ['responsavel_id', 'equipe', 'projeto_id']
  const canEditSensitive = isAdmin || isResponsavel

  // Whitelist
  const data: Record<string, any> = {}
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (!(field in body)) continue
    if (SENSITIVE_FIELDS.includes(field) && !canEditSensitive) continue
    data[field] = body[field]
  }

  // Regra de negocio: status Concluida exige data_conclusao.
  // Considera 3 fontes: body.data_conclusao novo, data_conclusao ja gravada,
  // ou nada — neste ultimo caso, recusa o save.
  if (body.status === 'Concluída') {
    const newConclusao =
      body.data_conclusao !== undefined ? body.data_conclusao : existing.data_conclusao
    if (!newConclusao) {
      return NextResponse.json(
        { error: 'Data de conclusão é obrigatória quando o status é Concluída' },
        { status: 400 },
      )
    }
    // Regra de negócio: só conclui com tempo lançado. tempo_gasto_total é a
    // soma dos lançamentos (read-only aqui), então reflete se há registro.
    // Validamos só na TRANSIÇÃO para Concluída (existing != Concluída) — assim
    // editar outros campos de uma tarefa já concluída (legada sem tempo) não
    // fica travado.
    if (existing.status !== 'Concluída' && Number(existing.tempo_gasto_total || 0) <= 0) {
      return NextResponse.json(
        { error: 'Lance o tempo gasto antes de concluir a tarefa' },
        { status: 400 },
      )
    }
  }
  // tempo_* com fallback + validação (evita gravar NaN/negativo)
  if (body.tempo_estimado !== undefined) {
    const n = Number(body.tempo_estimado)
    data.tempo_estimado = Number.isFinite(n) && n >= 0 ? n : (existing.tempo_estimado ?? 60)
  }

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
  const today = todayStr()
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

  // recursiveDelete: apaga o doc e TODAS as subcoleções (subtasks, comments,
  // time_entries, history) com batching e retry internos do Admin SDK.
  // Substitui o loop manual de batches, que podia deixar órfãos se falhasse
  // no meio (ex.: timeout) — e descobria as subcoleções por lista fixa.
  await adminDb.recursiveDelete(ref)
  return NextResponse.json({ ok: true })
}
