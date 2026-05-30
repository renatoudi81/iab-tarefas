'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Mail, MessageSquare, Phone, FileText, Mic, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { auth } from '@/lib/firebase-client'
import type { TaskFormData } from '@/types'

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Channel = 'email' | 'slack' | 'whatsapp' | 'form' | 'voice' | 'other'

const CHANNELS: { id: Channel; label: string; icon: typeof Mail }[] = [
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'slack', label: 'Slack/Teams', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone },
  { id: 'form', label: 'Formulário', icon: FileText },
  { id: 'voice', label: 'Voz/Reunião', icon: Mic },
  { id: 'other', label: 'Outro', icon: FileText },
]

const EXAMPLES: { channel: Channel; text: string }[] = [
  {
    channel: 'email',
    text: 'Assunto: Solicitação de relatório\n\nOi Renato, preciso urgente do relatório de produtividade da equipe de Avaliação do mês passado pra apresentar na reunião do conselho na sexta-feira. Inclui as horas trabalhadas e tarefas concluídas. Obrigado!',
  },
  {
    channel: 'whatsapp',
    text: 'Renato, lembra de organizar a formação dos novos professores? Tem que ter cronograma, contratar facilitadores e reservar a sala. Pode deixar pronto até dia 15 do mês que vem? Prioridade alta.',
  },
  {
    channel: 'voice',
    text: 'Anotação rápida: criar caderno de atividades pro 1º ano com 30 exercícios, dividir em 3 blocos temáticos. Pode pegar uma semana. Categoria conteúdo.',
  },
]

interface AITaskCreatorProps {
  open: boolean
  onClose: () => void
  /** Chamado com o initialData quando a IA termina. O parent abre o TaskModal.
   *  aiContext leva a mensagem original + a proposta da IA pra registrar
   *  aprendizado quando o humano corrige antes de salvar. */
  onReady: (
    initialData: Partial<TaskFormData>,
    meta: { confidence: number; reasoning: string },
    aiContext: { mensagem: string; proposta: { categoria: string | null; tipo_publico: string | null; canal: string | null; prioridade: string | null } },
  ) => void
}

interface ParsedResponse {
  task: {
    titulo: string
    descricao: string
    prioridade: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
    projeto_id: string | null
    projeto_nome: string | null
    tipo_publico: 'Externo' | 'Interno' | null
    categoria: string
    responsavel_id: string | null
    responsavel_nome: string | null
    data_prazo_sugerida: string | null
    tempo_estimado_minutos: number | null
    subtasks: string[]
    tags: string[]
    reasoning: string
  }
  confidence: number
  channel: string
  modelo: string
}

export function AITaskCreator({ open, onClose, onReady }: AITaskCreatorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [channel, setChannel] = useState<Channel>('email')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ParsedResponse | null>(null)

  // Defense in depth: só admin tem acesso ao modal (UI gate)
  if (!user || user.perfil !== 'Administrador') return null

  const reset = () => {
    setMessage('')
    setPreview(null)
    setError('')
    setChannel('email')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const loadExample = (ex: { channel: Channel; text: string }) => {
    setChannel(ex.channel)
    setMessage(ex.text)
    setPreview(null)
    setError('')
  }

  const analyze = async () => {
    if (!message.trim()) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/tasks/ai-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: message.trim(), channel }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao processar mensagem')
      }
      setPreview(data as ParsedResponse)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      setError(msg)
      toast.error('Erro na análise', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!preview) return
    // Mapeia o canal da UI (email/slack/...) pro nome canônico persistido
    const canalMap: Record<string, string | null> = {
      email: 'E-mail', whatsapp: 'WhatsApp', slack: 'Chat',
      form: 'Portal web', voice: 'Telefone', other: null,
    }
    const initialData: Partial<TaskFormData> = {
      titulo: preview.task.titulo,
      descricao: preview.task.descricao,
      prioridade: preview.task.prioridade,
      projeto_id: preview.task.projeto_id || '',
      tipo_publico: preview.task.tipo_publico,
      canal: canalMap[preview.channel] ?? null,
      categoria: preview.task.categoria,
      responsavel_id: preview.task.responsavel_id,
      tempo_estimado: preview.task.tempo_estimado_minutos || 60,
      data_prazo: preview.task.data_prazo_sugerida || '',
      tags: preview.task.tags || [],
    }
    onReady(
      initialData,
      { confidence: preview.confidence, reasoning: preview.task.reasoning },
      {
        mensagem: message.trim(),
        proposta: {
          categoria: preview.task.categoria || null,
          tipo_publico: preview.task.tipo_publico,
          canal: canalMap[preview.channel] ?? null,
          prioridade: preview.task.prioridade || null,
        },
      },
    )
    reset()
  }

  const prioColors: Record<string, string> = {
    'Crítica': 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]',
    'Alta': 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]',
    'Média': 'bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]',
    'Baixa': 'bg-[#E2E8F0] text-[#334155] border-[#94A3B8]',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      {/* Footer fixo (mesmo padrão do TaskModal) — body com scroll interno. */}
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
            <Sparkles size={16} className="text-[#7C3AED]" />
            Nova tarefa com IA
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">

        {/* ─── Etapa 1: Input ─────────────────────────────────────────── */}
        {!preview && (
          <div className="flex flex-col gap-4">
            {/* Canal */}
            <div className="flex flex-col gap-1.5">
              <Label>Canal de origem</Label>
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map(c => {
                  const Icon = c.icon
                  const active = channel === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChannel(c.id)}
                      className={
                        'inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border transition-colors cursor-pointer ' +
                        (active
                          ? 'bg-[#F5F3FF] border-[#A78BFA] text-[#6D28D9]'
                          : 'bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#A78BFA] hover:text-[#6D28D9]')
                      }
                    >
                      <Icon size={13} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Textarea */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-message">Mensagem original *</Label>
              <Textarea
                id="ai-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cole aqui o e-mail, mensagem ou anotação recebida..."
                rows={7}
                maxLength={5000}
                className="font-mono text-[0.82rem] leading-relaxed resize-none"
              />
              <div className="text-[0.7rem] text-[#A1A1AA] text-right tabular-nums">
                {message.length} / 5000 caracteres
              </div>
            </div>

            {/* Exemplos */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7rem] uppercase tracking-wider text-[#71717A]">
                Exemplos rápidos pra testar
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex, i) => {
                  const Icon = CHANNELS.find(c => c.id === ex.channel)?.icon || FileText
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => loadExample(ex)}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[0.72rem] text-[#71717A] bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] hover:text-[#0F172A] transition-colors cursor-pointer"
                    >
                      <Icon size={11} />
                      Exemplo {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5]">
                <AlertCircle size={14} className="text-[#B91C1C] flex-shrink-0 mt-0.5" />
                <div className="text-[0.82rem] text-[#991B1B]">{error}</div>
              </div>
            )}
          </div>
        )}

        {/* ─── Etapa 2: Preview ───────────────────────────────────────── */}
        <AnimatePresence>
          {preview && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-4"
            >
              {/* Confiança */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-[#F5F3FF] border border-[#DDD6FE]">
                <Sparkles size={16} className="text-[#7C3AED] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.72rem] uppercase tracking-wider text-[#6D28D9] font-semibold">
                    Confiança da IA: {preview.confidence}%
                  </div>
                  <div className="text-[0.82rem] text-[#52525B] mt-0.5 line-clamp-2">
                    {preview.task.reasoning}
                  </div>
                </div>
                <div className="w-16 h-1.5 bg-white rounded-full overflow-hidden border border-[#E4E4E7] flex-shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] transition-all"
                    style={{ width: `${preview.confidence}%` }}
                  />
                </div>
              </div>

              {/* Título */}
              <div className="flex flex-col gap-1.5">
                <Label>Título</Label>
                <div className="px-3 py-2 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#0F172A] font-medium">
                  {preview.task.titulo}
                </div>
              </div>

              {/* Projeto | Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Projeto</Label>
                  <div className="px-3 py-2 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#0F172A]">
                    {preview.task.projeto_nome || '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Categoria</Label>
                  <div className="px-3 py-2 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#0F172A]">
                    {preview.task.categoria || '—'}
                  </div>
                </div>
              </div>

              {/* Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Responsável</Label>
                  <div className="px-3 py-2 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#0F172A]">
                    {preview.task.responsavel_nome || 'Não atribuído'}
                  </div>
                </div>
              </div>

              {/* Prioridade | Estimado | Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Prioridade</Label>
                  <div>
                    <span className={`inline-flex text-[0.78rem] font-semibold px-2 py-1 rounded-md border ${prioColors[preview.task.prioridade]}`}>
                      {preview.task.prioridade}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Estimado (min)</Label>
                  <div className="px-3 py-2 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#0F172A] tabular-nums">
                    {preview.task.tempo_estimado_minutos ?? '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Prazo sugerido</Label>
                  <div className="px-3 py-2 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#0F172A] tabular-nums">
                    {preview.task.data_prazo_sugerida
                      ? new Date(preview.task.data_prazo_sugerida + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Subtarefas (se houver) */}
              {preview.task.subtasks.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>Subtarefas sugeridas</Label>
                  <ul className="rounded-md border border-[#E4E4E7] bg-[#FAFAFA] divide-y divide-[#E4E4E7]">
                    {preview.task.subtasks.map((s, i) => (
                      <li key={i} className="px-3 py-2 text-[0.82rem] text-[#3F3F46] flex gap-2">
                        <span className="text-[#A78BFA] font-mono tabular-nums">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags (se houver) */}
              {preview.task.tags.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.task.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-[0.72rem] font-medium text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 rounded-md"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[0.72rem] text-[#71717A] italic">
                Você poderá revisar e editar todos os campos no próximo passo antes de salvar.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        </div>

        <DialogFooter className="flex !justify-between gap-2 px-6 py-3 border-t border-[#E4E4E7] flex-shrink-0 bg-white">
          {!preview ? (
            <>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={analyze}
                disabled={loading || !message.trim()}
                className="bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] hover:opacity-90 text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.45)] gap-1.5"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles size={14} /> Analisar com IA</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setPreview(null)} className="gap-1.5">
                <RotateCcw size={13} /> Refazer
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] hover:opacity-90 text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.45)] gap-1.5"
              >
                Revisar e criar tarefa <ArrowRight size={14} />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
