// Limpeza sob demanda de imagens ORFAS no Vercel Blob.
//
// "Orfa" = arquivo que existe no Blob mas nao e referenciado por NENHUM
// documento do Firestore. Ex.: imagem inserida na descricao de uma tarefa
// e depois apagada do texto — a URL some do banco, mas o arquivo continua
// no Blob ocupando espaco.
//
// O script coleta TODAS as URLs do Blob em uso no banco antes de apagar:
//   - tasks.descricao  / tasks.observacoes  (tags <img src="...">)
//   - tasks.anexos[].url                    (anexos de tarefa)
//   - users.avatar_url                      (caso algum avatar use Blob)
// Qualquer arquivo do Blob fora desse conjunto e considerado orfao.
//
// SEGURO POR PADRAO: roda em modo dry-run (so lista o que apagaria).
// Para apagar de fato, passe --apply.
//
// Uso:
//   node scripts/limpar-imagens-orfas.mjs           (dry-run — nao apaga nada)
//   node scripts/limpar-imagens-orfas.mjs --apply   (apaga as orfas)

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { list, del } from '@vercel/blob'
import { config } from 'dotenv'

config({ path: '.env.local' })

const APPLY = process.argv.includes('--apply')

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const blobToken = process.env.BLOB_READ_WRITE_TOKEN

if (!projectId || !clientEmail || !privateKey) {
  console.error('Credenciais Firebase Admin ausentes em .env.local')
  process.exit(1)
}
if (!blobToken) {
  console.error('BLOB_READ_WRITE_TOKEN ausente em .env.local')
  process.exit(1)
}
if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}
const db = getFirestore('default')

// Normaliza uma URL do Blob para comparacao estavel (sem querystring).
function normalize(url) {
  if (!url || typeof url !== 'string') return ''
  return url.split('?')[0].trim()
}

async function coletarUrlsEmUso() {
  const emUso = new Set()
  const addImgs = (html) => {
    if (!html) return
    for (const m of String(html).matchAll(/<img[^>]+src="([^"]+)"/g)) {
      emUso.add(normalize(m[1]))
    }
  }

  const tasks = await db.collection('tasks').get()
  tasks.docs.forEach((d) => {
    const t = d.data() || {}
    addImgs(t.descricao)
    addImgs(t.observacoes)
    if (Array.isArray(t.anexos)) {
      t.anexos.forEach((a) => { if (a && a.url) emUso.add(normalize(a.url)) })
    }
  })

  const users = await db.collection('users').get()
  users.docs.forEach((d) => {
    const u = d.data() || {}
    if (u.avatar_url) emUso.add(normalize(u.avatar_url))
  })

  return emUso
}

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY (vai apagar)' : 'DRY-RUN (nao apaga nada)'}`)
  console.log('Coletando URLs em uso no Firestore...')
  const emUso = await coletarUrlsEmUso()
  console.log(`  URLs referenciadas no banco: ${emUso.size}`)

  console.log('Listando arquivos no Vercel Blob...')
  const { blobs } = await list({ token: blobToken, limit: 1000 })
  console.log(`  Arquivos no Blob: ${blobs.length}`)

  const orfas = blobs.filter((b) => !emUso.has(normalize(b.url)))
  const bytesOrfas = orfas.reduce((s, b) => s + (b.size || 0), 0)

  if (orfas.length === 0) {
    console.log('Nenhuma imagem orfa encontrada. Nada a fazer.')
    return
  }

  console.log(`\nOrfas encontradas: ${orfas.length} (~${(bytesOrfas / 1024).toFixed(1)} KB)`)
  orfas.forEach((b) => console.log(`  ${(b.size / 1024).toFixed(1)} KB  ${b.pathname}`))

  if (!APPLY) {
    console.log('\n[DRY-RUN] Nada foi apagado. Rode com --apply para remover as orfas acima.')
    return
  }

  console.log('\nApagando orfas...')
  let ok = 0
  for (const b of orfas) {
    try {
      await del(b.url, { token: blobToken })
      ok++
    } catch (e) {
      console.error(`  Falha ao apagar ${b.pathname}: ${e.message}`)
    }
  }
  console.log(`Concluido. Apagadas ${ok}/${orfas.length} (~${(bytesOrfas / 1024).toFixed(1)} KB liberados).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
