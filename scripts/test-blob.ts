/**
 * Teste rápido do Vercel Blob — sobe um arquivo pequeno, lê de volta
 * e deleta. Valida que o BLOB_READ_WRITE_TOKEN está funcionando.
 *
 * Rodar: npx tsx scripts/test-blob.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { put, del, head } = await import('@vercel/blob')

  console.log('🔍 Testando Vercel Blob...\n')

  // Texto pequeno como teste
  const content = `IAB Tarefas — smoke test do Vercel Blob @ ${new Date().toISOString()}`
  const filename = `_test/smoke-${Date.now()}.txt`

  // 1. Upload
  console.log('📤 Subindo arquivo...')
  const blob = await put(filename, content, {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
  })
  console.log(`   ✓ URL: ${blob.url}`)
  console.log(`   ✓ Tamanho: ${content.length} bytes`)

  // 2. Verificar que existe
  console.log('\n📥 Verificando metadados...')
  const meta = await head(blob.url)
  console.log(`   ✓ contentType: ${meta.contentType}`)
  console.log(`   ✓ uploadedAt:  ${meta.uploadedAt}`)

  // 3. Ler conteúdo via HTTP público
  console.log('\n🌐 Baixando pelo URL público...')
  const res = await fetch(blob.url)
  if (!res.ok) throw new Error(`Falha ao baixar: ${res.status}`)
  const downloaded = await res.text()
  if (downloaded !== content) throw new Error('Conteúdo baixado não bate com o enviado')
  console.log(`   ✓ Conteúdo conferido (${downloaded.length} bytes)`)

  // 4. Cleanup
  console.log('\n🧹 Apagando o arquivo de teste...')
  await del(blob.url)
  console.log('   ✓ Deletado')

  console.log('\n🎉 Vercel Blob funcionando!')
}

main().catch(e => { console.error('\n❌ Erro:', e); process.exit(1) })
