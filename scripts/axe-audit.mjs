/**
 * Auditoria axe-core sobre dev server local.
 *
 * Uso:
 *   node scripts/axe-audit.mjs
 *
 * Configure BASE_URL e ROUTES via env, ex.:
 *   BASE_URL=http://localhost:3000 node scripts/axe-audit.mjs
 *
 * Se TEST_EMAIL/TEST_PASSWORD estiverem definidas, tenta fazer login
 * antes de auditar rotas autenticadas.
 */
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD

const PUBLIC_ROUTES = ['/login']
const PRIVATE_ROUTES = [
  '/dashboard',
  '/lista',
  '/kanban',
  '/gantt',
  '/relatorios',
  '/perfil',
]

const OUT_DIR = './axe-report'
mkdirSync(OUT_DIR, { recursive: true })

async function auditRoute(page, route) {
  console.log(`\n▶ Auditando ${route} ...`)
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 })
  if (route !== '/login') {
    await page.waitForSelector('#main-content', { timeout: 15000 }).catch(() => {})
    await page.waitForSelector('main h1', { timeout: 10000 }).catch(() => {})
  }
  // Aguarda animações framer-motion + SWR fetches
  await page.waitForTimeout(4000)
  // Força opacity:1 em qualquer motion.div que ainda esteja em frame intermediário
  // (axe avalia contraste pixel-a-pixel e enxerga 0.3 como cor desbotada)
  await page.evaluate(() => {
    document.querySelectorAll('[style*="opacity"]').forEach((el) => {
      el.style.opacity = '1'
    })
  })
  await page.waitForTimeout(300)

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()

  const summary = {
    route,
    url: results.url,
    violations: results.violations.length,
    incomplete: results.incomplete.length,
    passes: results.passes.length,
    inapplicable: results.inapplicable.length,
  }

  // Imprime violations resumidas no console
  if (results.violations.length === 0) {
    console.log(`  ✓ Sem violações (${results.passes.length} regras passaram)`)
  } else {
    console.log(`  ✗ ${results.violations.length} violações:`)
    for (const v of results.violations) {
      console.log(`    [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nós)`)
    }
  }

  // Salva resultado completo em JSON
  const fname = route === '/' ? 'root' : route.replaceAll('/', '_')
  writeFileSync(`${OUT_DIR}/${fname}.json`, JSON.stringify(results, null, 2))

  return summary
}

async function login(page) {
  if (!EMAIL || !PASSWORD) return false
  console.log(`\n🔐 Login como ${EMAIL} ...`)
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  // Espera redirect pra /dashboard
  await page.waitForURL(/\/dashboard|\/lista|\/kanban/, { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1500)
  return true
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    // Desativa animações framer-motion + CSS para que o axe capture estado final,
    // evitando falsos positivos de contraste em frames intermediários (opacity 0.3 etc).
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()

  const summaries = []

  // Públicas
  for (const r of PUBLIC_ROUTES) {
    summaries.push(await auditRoute(page, r))
  }

  // Tenta login pra rotas privadas
  const logged = await login(page)
  if (logged) {
    for (const r of PRIVATE_ROUTES) {
      summaries.push(await auditRoute(page, r))
    }
  } else {
    console.log('\n⚠ TEST_EMAIL/TEST_PASSWORD não definidos — pulando rotas privadas.')
  }

  await browser.close()

  // Resumo final
  console.log('\n' + '═'.repeat(60))
  console.log('RESUMO')
  console.log('═'.repeat(60))
  for (const s of summaries) {
    const tag = s.violations === 0 ? '✓' : '✗'
    console.log(`${tag}  ${s.route.padEnd(20)} violations=${s.violations}  passes=${s.passes}`)
  }
  writeFileSync(`${OUT_DIR}/_summary.json`, JSON.stringify(summaries, null, 2))
  console.log(`\nRelatórios em: ${OUT_DIR}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
