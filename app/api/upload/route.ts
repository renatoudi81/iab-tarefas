import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { put } from '@vercel/blob'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

export async function POST(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo excede o limite de 10 MB' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const uniqueName = `tasks/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`

  const blob = await put(uniqueName, file, { access: 'public' })

  return NextResponse.json({ url: blob.url, nome: file.name, tipo: file.type }, { status: 201 })
}
