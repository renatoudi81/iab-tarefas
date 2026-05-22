import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const snap = await adminDb.collection('categories').orderBy('nome', 'asc').get()
  const categories = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ categories })
}

export async function POST(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (user.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem criar categorias' }, { status: 403 })
  }

  const { nome } = await req.json()
  const nomeTrim = nome?.trim()
  if (!nomeTrim) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  // Checa duplicidade (Firestore não tem unique constraint)
  const dup = await adminDb.collection('categories').where('nome', '==', nomeTrim).limit(1).get()
  if (!dup.empty) return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 })

  const data = { nome: nomeTrim, criado_em: new Date().toISOString() }
  const ref = await adminDb.collection('categories').add(data)
  const category = { id: ref.id, ...data }
  return NextResponse.json({ category }, { status: 201 })
}
