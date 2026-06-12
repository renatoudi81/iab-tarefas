export type Perfil = 'Administrador' | 'Usuário'

export interface User {
  id: string
  nome: string
  email: string
  perfil: Perfil
  avatar_color: string
  /** Foto do usuário em data URL (JPEG redimensionado p/ 256×256). Null/undefined → usa iniciais + avatar_color */
  avatar_url?: string | null
  ativo: boolean
  criado_em: string
}

export interface Category {
  id: string
  nome: string
  criado_em: string
}

export interface Project {
  id: string
  nome: string
  criado_em: string
}

export type Status = 'Pendente' | 'Em andamento' | 'Atrasada' | 'Aguardando' | 'Concluída'
export type Prioridade = 'Baixa' | 'Média' | 'Alta' | 'Crítica'

export interface Anexo {
  nome: string
  url: string
  tipo: string
}

export interface Task {
  id: string
  /** Numero sequencial humano (#1, #2, ...). Atribuido na criacao via contador atomico. */
  numero?: number
  titulo: string
  descricao: string | null
  observacoes: string | null
  projeto_id: string
  categoria: string
  /** Classificação de chamado — opcional */
  tipo_publico: 'Externo' | 'Interno' | null
  /** Canal de origem do chamado — opcional */
  canal: string | null
  prioridade: Prioridade
  status: Status
  responsavel_id: string | null
  equipe: string[]
  data_inicio: string | null
  data_prazo: string | null
  data_conclusao: string | null
  tempo_estimado: number
  tempo_gasto_total: number
  tags: string[]
  anexos: Anexo[]
  aguardando_quem: string | null
  data_retorno_esperada: string | null
  criado_em: string
  atualizado_em: string
  responsavel?: User | null
}

export interface Notification {
  id: string
  usuario_id: string
  tipo: 'tarefa_atribuida' | 'comentario' | 'prazo_proximo' | 'status_alterado'
  titulo: string
  mensagem: string
  tarefa_id: string | null
  lida: boolean
  criado_em: string
}

export interface TaskHistory {
  id: string
  tarefa_id: string
  usuario_id: string
  campo: string
  valor_ant: string | null
  valor_novo: string | null
  criado_em: string
  usuario: { nome: string; avatar_color: string }
}

export interface TimeEntry {
  id: string
  tarefa_id: string
  usuario_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  duracao: number
  tipo: 'manual' | 'automatico'
  /** Descrição curta do que foi feito (estilo Redmine, ≤255 car.) */
  comentario?: string | null
  /** Tipo de atividade (estilo Redmine): Análise, Desenvolvimento, etc. */
  atividade?: string | null
  criado_em: string
}

/** Catálogo de atividades para lançamento de tempo (estilo Redmine).
 *  Lista fixa, editável aqui — pode virar coleção configurável no futuro. */
export const ATIVIDADES_TEMPO = [
  'Análise',
  'Desenvolvimento',
  'Atendimento',
  'Reunião',
  'Documentação',
  'Planejamento',
  'Outro',
] as const

export type TaskFormData = Omit<Task, 'id' | 'criado_em' | 'atualizado_em' | 'responsavel'>

export const STATUSES: Record<string, Status> = {
  PENDING: 'Pendente',
  PROGRESS: 'Em andamento',
  DELAYED: 'Atrasada',
  WAITING: 'Aguardando',
  DONE: 'Concluída'
}

export const PRIORITIES: Record<string, Prioridade> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica'
}

export const STATUS_LABELS: Record<Status, string> = {
  'Pendente': 'Pendente',
  'Em andamento': 'Em andamento',
  'Atrasada': 'Atrasada',
  'Aguardando': 'Aguardando Retorno',
  'Concluída': 'Concluída',
}

export const STATUS_COLORS: Record<Status, string> = {
  // Versões -700 garantem contraste 4.5:1 quando usadas como texto sobre bg claro.
  'Pendente':     '#475569', // slate-600
  'Em andamento': '#1D4ED8', // blue-700
  'Atrasada':     '#B91C1C', // red-700
  'Aguardando':   '#B45309', // amber-700
  'Concluída':    '#15803D', // green-700
}

export const PRIORITY_COLORS: Record<Prioridade, string> = {
  // Versões -800 dos hues amarelos/marrons (alta) e -700 dos outros, para
  // garantir contraste 4.5:1 do texto sobre bg do mesmo hue (alpha ~13%).
  'Baixa':   '#334155', // slate-700
  'Média':   '#1D4ED8', // blue-700
  'Alta':    '#92400E', // amber-800 (mais escuro pra contraste no bg amarelado)
  'Crítica': '#991B1B', // red-800
}

export function getInitials(nome: string): string {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

/**
 * Formata numero com virgula decimal (pt-BR).
 * - formatNumberBR(32.9) => "32,9"
 * - formatNumberBR(32.9, 1) => "32,9"
 * - formatNumberBR(32, 1) => "32" (omite zero decimal quando inteiro)
 * - formatNumberBR(1234.5) => "1.234,5"
 */
export function formatNumberBR(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return '0'
  // toLocaleString do pt-BR ja faz a conversao (ponto -> virgula, milhar com ponto)
  const isInteger = n % 1 === 0
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: isInteger ? 0 : decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Regra HIBRIDA de filtro por periodo (Dashboard, Relatorios, Kanban, Lista).
 *
 * Uma tarefa entra no periodo se QUALQUER uma destas datas cair no intervalo:
 *   - criado_em   (foi aberta)
 *   - data_conclusao (foi finalizada)
 *   - data_prazo  (tem prazo dentro do periodo)
 *
 * Assim o usuario nao perde tarefas que foram abertas fora do periodo mas
 * concluidas dentro, nem tarefas com prazo no periodo mas abertas antes.
 *
 * Quando NAO ha filtro (from e to vazios), retorna true para todas.
 */
export interface TaskDateFields {
  criado_em?: string | null
  data_conclusao?: string | null
  data_prazo?: string | null
}
export function taskInPeriod(
  task: TaskDateFields,
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  if (!from && !to) return true
  const inRange = (d: string | null | undefined): boolean => {
    if (!d) return false
    const day = d.slice(0, 10) // normaliza YYYY-MM-DD (ignora hora)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  }
  return inRange(task.criado_em) || inRange(task.data_conclusao) || inRange(task.data_prazo)
}

/**
 * "Hoje" no fuso de negócio (America/Sao_Paulo), formato YYYY-MM-DD.
 *
 * NUNCA usar `new Date().toISOString().split('T')[0]` para obter o dia atual:
 * toISOString() é UTC — no Brasil (UTC-3), a partir das 21h locais o resultado
 * vira o dia SEGUINTE. Sintomas que isso causava: tarefa marcada Atrasada às
 * 21h, lançamento de tempo com data de amanhã, "vence hoje" errado à noite.
 *
 * Fuso FIXO (não o do dispositivo): o servidor da Vercel roda em UTC e um
 * usuário viajando não deve mudar o dia de negócio do Instituto.
 * Intl com en-CA devolve exatamente YYYY-MM-DD.
 */
export function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Range padrão dos filtros de data: 1º ao último dia do mês corrente.
 * Ex.: em junho/2026 → { from: '2026-06-01', to: '2026-06-30' }.
 * Deriva de todayStr() (fuso America/Sao_Paulo) — mesmo "hoje" do resto
 * do sistema, independente do relógio/fuso do dispositivo.
 */
export function currentMonthRange(): { from: string; to: string } {
  const [y, m] = todayStr().split('-').map(Number) // m: 1-12
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(y, m, 0).getDate() // dia 0 do mês seguinte = último do atual
  return {
    from: `${y}-${pad(m)}-01`,
    to: `${y}-${pad(m)}-${pad(lastDay)}`,
  }
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA).
 *
 * Aceita:
 *  - 'YYYY-MM-DD'              → '25/12/2024'
 *  - 'YYYY-MM-DDTHH:mm:ss'     → '25/12/2024'
 *  - Date object               → '25/12/2024'
 *  - null/undefined/''         → '' (string vazia, seguro para renderização)
 *
 * NÃO usa toLocaleDateString() para evitar timezone surprises
 * (datas armazenadas como 'YYYY-MM-DD' representam dias absolutos,
 * não instantes no tempo, então parsing direto é mais correto).
 */
export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return ''

  let y: number, m: number, d: number

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return ''
    y = value.getFullYear()
    m = value.getMonth() + 1
    d = value.getDate()
  } else {
    // String: pega só a parte da data (antes do T se houver timestamp)
    const dateOnly = value.split('T')[0]
    const parts = dateOnly.split('-')
    if (parts.length !== 3) return value // formato desconhecido — devolve original
    y = Number(parts[0])
    m = Number(parts[1])
    d = Number(parts[2])
    if (!y || !m || !d) return value
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d)}/${pad(m)}/${y}`
}

/**
 * Formata data + hora curta (DD/MM/AAAA HH:mm).
 * Útil para timestamps de comentários, histórico, notificações.
 */
export function formatDateTimeBR(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Retorna o dia da semana por extenso (pt-BR) de uma data 'YYYY-MM-DD'.
 * Faz parsing manual (T00:00:00) para evitar surpresas de timezone
 * (datas 'YYYY-MM-DD' representam dias absolutos, não instantes).
 */
export function weekdayBR(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date
    ? value
    : new Date(value.split('T')[0] + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  return ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][d.getDay()]
}
