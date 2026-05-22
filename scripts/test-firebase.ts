/**
 * Teste rápido de conexão com Firebase Admin SDK.
 * Rodar com: npx tsx scripts/test-firebase.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { adminDb, adminAuth } = await import('../lib/firebase-admin')

  console.log('🔍 Testando conexão com Firebase...')
  console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}`)
  console.log(`   SA email: ${process.env.FIREBASE_CLIENT_EMAIL}\n`)

  // Teste Auth PRIMEIRO (mais simples, não precisa de banco)
  try {
    const users = await adminAuth.listUsers(5)
    console.log(`✅ Auth conectado. Usuários: ${users.users.length}`)
  } catch (e: any) {
    console.error('❌ Erro Auth:', e.code, e.message)
    process.exit(1)
  }

  // Teste Firestore
  try {
    const ref = adminDb.collection('_test').doc('connection-check')
    await ref.set({ ts: new Date().toISOString(), ok: true })
    const snap = await ref.get()
    console.log(`✅ Firestore conectado. Doc:`, snap.data())
    await ref.delete()
  } catch (e: any) {
    console.error('\n❌ Erro Firestore:', e.code, e.message || '(sem mensagem)')
    console.error('\n   Possíveis causas:')
    console.error('   1. Banco criado em modo Datastore (precisa ser Native)')
    console.error('   2. Permissões IAM ainda propagando (espere 1-2 min)')
    console.error('   3. Cloud Firestore API não habilitada no Google Cloud')
    console.error('\n   Detalhes:', JSON.stringify(e, null, 2))
    process.exit(1)
  }

  console.log('\n🎉 Firebase Admin SDK funcionando corretamente!')
}

main().catch(console.error)
