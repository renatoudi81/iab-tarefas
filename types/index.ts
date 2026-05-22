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

export type Status = 'Pendente' | 'Em andamento' | 'Atrasada' | 'Aguardando' | 'Concluída'
export type Prioridade = 'Baixa' | 'Média' | 'Alta' | 'Crítica'

export interface Anexo {
  nome: string
  url: string
  tipo: string
}

export interface Task {
  id: string
  titulo: string
  descricao: string | null
  observacoes: string | null
  categoria: string
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
  /** Contagens retornadas pela API de listagem */
  _count?: { subtasks: number; comments: number }
  /** Subtarefas (somente campo concluída) retornadas na listagem */
  subtasks?: { concluida: boolean }[]
}

export interface Comment {
  id: string
  tarefa_id: string
  usuario_id: string
  texto: string
  criado_em: string
  editado_em: string
  usuario: { nome: string; avatar_color: string }
}

export interface Subtask {
  id: string
  tarefa_id: string
  titulo: string
  concluida: boolean
  ordem: number
  criado_em: string
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
  criado_em: string
}

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
  'Pendente': '#64748b',
  'Em andamento': '#3b82f6',
  'Atrasada': '#ef4444',
  'Aguardando': '#f59e0b',
  'Concluída': '#22c55e'
}

export const PRIORITY_COLORS: Record<Prioridade, string> = {
  'Baixa': '#64748b',
  'Média': '#3b82f6',
  'Alta': '#f59e0b',
  'Crítica': '#ef4444'
}

export function getInitials(nome: string): string {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
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
