import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const isAdmin = authUser.perfil === 'Administrador'
  const isSelf = authUser.uid === id

  if (!isAdmin && !isSelf) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const ref = adminDb.collection('users').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const dataFs: Record<string, unknown> = {}
  const dataAuth: Record<string, unknown> = {}

  if (body.nome) {
    dataFs.nome = body.nome.trim()
    dataAuth.displayName = body.nome.trim()
  }
  if (body.avatar_color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(body.avatar_color)) {
      return NextResponse.json({ error: 'Cor de avatar inválida (use hex #RRGGBB)' }, { status: 400 })
    }
    dataFs.avatar_color = body.avatar_color
  }
  // avatar_url: string para definir foto, null para remover (volta às iniciais)
  if (body.avatar_url !== undefined) {
    // Validações básicas: aceita data URL de imagem OU null
    if (body.avatar_url === null) {
      dataFs.avatar_url = null
      dataAuth.photoURL = null
    } else if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('data:image/')) {
      // Limite defensivo: 200 KB de payload (foto resize'd deve dar ~10-20 KB)
      if (body.avatar_url.length > 200_000) {
        return NextResponse.json({ error: 'Imagem muito grande. Tente novamente.' }, { status: 413 })
      }
      dataFs.avatar_url = body.avatar_url
      // displayName/photoURL do Auth tem limite 2048 chars; não vamos pôr base64 lá
    } else {
      return NextResponse.json({ error: 'avatar_url inválido' }, { status: 400 })
    }
  }

  if (isAdmin) {
    if (body.perfil !== undefined) {
      if (body.perfil !== 'Administrador' && body.perfil !== 'Usuário') {
        return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
      }
      dataFs.perfil = body.perfil
    }
    if (body.ativo !== undefined) {
      dataFs.ativo = body.ativo
      dataAuth.disabled = !body.ativo
    }
    if (body.email) {
      const novoEmail = body.email.toLowerCase().trim()
      const dup = await adminDb.collection('users').where('email', '==', novoEmail).limit(2).get()
      if (dup.docs.some(d => d.id !== id)) {
        return NextResponse.json({ error: 'E-mail já cadastrado por outro usuário' }, { status: 409 })
      }
      dataFs.email = novoEmail
      dataAuth.email = novoEmail
    }
  }

  if (body.nova_senha) {
    if (body.nova_senha.length < 6) return NextResponse.json({ error: 'Senha deve ter mínimo 6 caracteres' }, { status: 400 })
    dataAuth.password = body.nova_senha
  }

  if (Object.keys(dataAuth).length > 0) {
    try {
      await adminAuth.updateUser(id, dataAuth)
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'E-mail já cadastrado por outro usuário' }, { status: 409 })
      }
      return NextResponse.json({ error: e.message || 'Erro ao atualizar Auth' }, { status: 500 })
    }
  }

  if (Object.keys(dataFs).length > 0) {
    await ref.update(dataFs)
  }

  const updated = await ref.get()
  const { password_hash, ...rest } = updated.data() as any
  return NextResponse.json({ user: { id: updated.id, ...rest } })
}

export async function DELETE(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (authUser.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem excluir usuários' }, { status: 403 })
  }

  const { id } = await params
  if (id === authUser.uid) return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 })

  await adminAuth.deleteUser(id).catch((e: any) => {
    if (e.code !== 'auth/user-not-found') throw e
  })
  await adminDb.collection('users').doc(id).delete()

  return NextResponse.json({ ok: true })
}
