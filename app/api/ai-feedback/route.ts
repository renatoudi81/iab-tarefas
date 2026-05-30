/**
 * Aprendizado por contexto (few-shot) da criação de chamados por IA.
 *
 * POST: registra uma correção feita pelo humano — o par
 *       (proposta da IA) → (valores finais salvos). Só grava quando há
 *       divergência em pelo menos um campo monitorado.
 * GET:  retorna as últimas N correções (default 10) pra alimentar o prompt.
 *
 * Collection: ai_feedback
 *   { mensagem, proposta: {categoria,tipo_publico,canal,prioridade},
 *     final: {categoria,tipo_publico,canal,prioridade}, criado_em }
 */
import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

interface Classificacao {
  categoria?: string | null
  tipo_publico?: string | null
  canal?: string | null
  prioridade?: string | null
}

const MONITORED: (keyof Classificacao)[] = ['categoria', 'tipo_publico', 'canal', 'prioridade']

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ feedback: [] })
  }

  const url = new URL(req.url)
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10))

  const snap = await adminDb
    .collection('ai_feedback')
    .orderBy('criado_em', 'desc')
    .limit(limit)
    .get()
  const feedback = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ feedback })
}

export async function POST(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 })
  }

  let body: { mensagem?: string; proposta?: Classificacao; final?: Classificacao }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const proposta = body.proposta || {}
  const final = body.final || {}

  // Só registra se houve divergência em algum campo monitorado
  const houveCorrecao = MONITORED.some(k => (proposta[k] ?? null) !== (final[k] ?? null))
  if (!houveCorrecao) {
    return NextResponse.json({ ok: true, registrado: false })
  }

  const data = {
    mensagem: (body.mensagem || '').slice(0, 600), // trecho pra few-shot
    proposta: {
      categoria: proposta.categoria ?? null,
      tipo_publico: proposta.tipo_publico ?? null,
      canal: proposta.canal ?? null,
      prioridade: proposta.prioridade ?? null,
    },
    final: {
      categoria: final.categoria ?? null,
      tipo_publico: final.tipo_publico ?? null,
      canal: final.canal ?? null,
      prioridade: final.prioridade ?? null,
    },
    criado_em: new Date().toISOString(),
  }
  const ref = await adminDb.collection('ai_feedback').add(data)
  return NextResponse.json({ ok: true, registrado: true, id: ref.id }, { status: 201 })
}
