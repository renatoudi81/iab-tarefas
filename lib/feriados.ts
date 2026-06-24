/**
 * Feriados nacionais brasileiros (formato YYYY-MM-DD), incluindo os móveis
 * derivados da Páscoa. Usado para calcular dias úteis (ex.: capacidade de
 * horas de trabalho nos relatórios).
 *
 * Inclui:
 *  - Fixos: Confraternização, Tiradentes, Dia do Trabalho, Independência,
 *    N. Sra. Aparecida, Finados, Proclamação da República, Consciência Negra
 *    (nacional desde 2024 — Lei 14.759/2023) e Natal.
 *  - Móveis: Carnaval (seg+ter), Sexta-feira Santa, Corpus Christi.
 *    Carnaval e Corpus Christi são ponto facultativo federal, mas na prática
 *    são dias não trabalhados — incluídos para refletir a capacidade real.
 *
 * Cache por ano (o cálculo da Páscoa é barato, mas evita recomputar em loop).
 */
const cache = new Map<number, Set<string>>()

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em UTC. */
function pascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31) // 3=março, 4=abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(ano, mes - 1, dia))
}

function addDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + dias)
  return d
}

export function feriadosNacionais(ano: number): Set<string> {
  const cached = cache.get(ano)
  if (cached) return cached

  const set = new Set<string>([
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // N. Sra. Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Consciência Negra
    `${ano}-12-25`, // Natal
  ])

  const dom = pascoa(ano)
  set.add(ymd(addDias(dom, -48))) // Segunda de Carnaval
  set.add(ymd(addDias(dom, -47))) // Terça de Carnaval
  set.add(ymd(addDias(dom, -2)))  // Sexta-feira Santa
  set.add(ymd(addDias(dom, 60)))  // Corpus Christi

  cache.set(ano, set)
  return set
}

/**
 * Dia útil = não é sábado/domingo nem feriado nacional.
 * `dia` no formato YYYY-MM-DD.
 */
export function isDiaUtil(dia: string): boolean {
  if (!dia || dia.length < 10) return false
  const dow = new Date(dia.slice(0, 10) + 'T00:00:00').getDay() // 0=dom, 6=sáb
  if (dow === 0 || dow === 6) return false
  const ano = Number(dia.slice(0, 4))
  return !feriadosNacionais(ano).has(dia.slice(0, 10))
}
