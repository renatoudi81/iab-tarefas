/**
 * Cadastra as 11 categorias da taxonomia de chamados (idempotente).
 * Não duplica: só insere as que ainda não existem (match por nome).
 *
 * Uso: node scripts/seed-categorias-chamados.mjs
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { config } from 'dotenv'

config({ path: '.env.local' })

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Credenciais Firebase Admin não encontradas em .env.local')
  process.exit(1)
}
if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}
const db = getFirestore('default')

// 6 externas + 5 internas (seção 1 e 2 da taxonomia)
const CATEGORIAS = [
  // Externo (clientes)
  'Dúvida de uso do sistema',
  'Erro / Falha técnica',
  'Cadastro / Acesso',
  'Financeiro / Cobrança',
  'Relatórios / Dados',
  'Reclamação / Feedback',
  // Interno (equipes)
  'TI / Infraestrutura',
  'Financeiro / Contabilidade',
  'Pedagógico / Acadêmico',
  'Comercial / Vendas',
  'Coordenação / Gerencial',
]

async function main() {
  console.log('📋 Cadastrando categorias de chamados (idempotente)...\n')
  const snap = await db.collection('categories').get()
  const existentes = new Set(snap.docs.map(d => (d.data().nome || '').trim()))

  let criadas = 0, puladas = 0
  for (const nome of CATEGORIAS) {
    if (existentes.has(nome)) {
      console.log(`  • já existe: ${nome}`)
      puladas++
      continue
    }
    await db.collection('categories').add({ nome, criado_em: new Date().toISOString() })
    console.log(`  ✓ criada:   ${nome}`)
    criadas++
  }

  console.log(`\n✅ Concluído. ${criadas} criada(s), ${puladas} já existia(m).`)
}

main().catch((err) => { console.error('❌ Erro:', err); process.exit(1) })
