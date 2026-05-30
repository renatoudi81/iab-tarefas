import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const snap = await adminDb.collection('projects').orderBy('nome', 'asc').get()
  const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem criar projetos' }, { status: 403 })
  }

  const { nome } = await req.json()
  const nomeTrim = nome?.trim()
  if (!nomeTrim) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const dup = await adminDb.collection('projects').where('nome', '==', nomeTrim).limit(1).get()
  if (!dup.empty) return NextResponse.json({ error: 'Projeto já existe' }, { status: 409 })

  const data = { nome: nomeTrim, criado_em: new Date().toISOString() }
  const ref = await adminDb.collection('projects').add(data)
  const project = { id: ref.id, ...data }
  return NextResponse.json({ project }, { status: 201 })
}
