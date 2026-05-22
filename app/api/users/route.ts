import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const snap = await adminDb.collection('users').orderBy('nome', 'asc').get()
  const users = snap.docs.map(d => {
    const { password_hash, ...rest } = d.data() as any
    return { id: d.id, ...rest }
  })
  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const auth = await verifyAuth(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (auth.perfil !== 'Administrador') {
    return NextResponse.json({ error: 'Somente administradores podem criar usuários' }, { status: 403 })
  }

  const { nome, email, senha, perfil, avatar_color, ativo } = await req.json()

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  // Senha é OPCIONAL:
  // - Com senha: admin define a senha inicial (pode informar ao usuário separadamente)
  // - Sem senha: usuário será criado sem credencial e o cliente vai disparar
  //   o e-mail de "definir senha" via sendPasswordResetEmail (fluxo de onboarding)
  if (senha !== undefined && senha !== '' && senha.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter mínimo 6 caracteres' }, { status: 400 })
  }

  const emailNorm = email.toLowerCase().trim()
  const nomeNorm = nome.trim()

  // 1) Cria no Firebase Auth (falha se e-mail já existir)
  let authUser
  try {
    authUser = await adminAuth.createUser({
      email: emailNorm,
      // password só é incluído se informado; sem ele, o usuário não consegue logar
      // até definir uma senha via fluxo de redefinição
      ...(senha ? { password: senha } : {}),
      displayName: nomeNorm,
      disabled: ativo === false,
    })
  } catch (e: any) {
    if (e.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || 'Erro ao criar usuário no Auth' }, { status: 500 })
  }

  // 2) Cria no Firestore com o MESMO uid do Auth (chave de ligação)
  const userData = {
    nome: nomeNorm,
    email: emailNorm,
    perfil: perfil || 'Usuário',
    avatar_color: avatar_color || '#6366f1',
    ativo: ativo !== false,
    criado_em: new Date().toISOString(),
  }

  try {
    await adminDb.collection('users').doc(authUser.uid).set(userData)
  } catch (_e) {
    // Rollback: se Firestore falhar, remove do Auth para evitar inconsistência
    await adminAuth.deleteUser(authUser.uid).catch(() => {})
    return NextResponse.json({ error: 'Erro ao gravar usuário no Firestore' }, { status: 500 })
  }

  return NextResponse.json({ user: { id: authUser.uid, ...userData } }, { status: 201 })
}
