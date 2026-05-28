/**
 * POST /api/tasks/ai-parse
 *
 * Recebe uma mensagem em texto livre (e-mail copiado, transcrição de voz,
 * anotação rápida, formulário externo, etc.) e usa o Claude (Anthropic) pra
 * extrair uma tarefa estruturada nos campos do IAB Tarefas.
 *
 * O endpoint:
 *  1. Autentica o usuário (admin OU colaborador comum podem usar)
 *  2. Lê categorias e usuários do Firestore para passar à IA como "vocabulário"
 *     — assim a IA escolhe valores reais do banco em vez de inventar
 *  3. Monta um prompt com instruções estritas de JSON-only
 *  4. Chama claude-sonnet-4-5 com max_tokens limitado
 *  5. Retorna ParsedTask tipado, pronto pra alimentar o TaskModal
 *
 * Não persiste nada — o usuário ainda revisa e clica "Salvar".
 *
 * Body esperado:
 *   { message: string, channel?: 'email' | 'slack' | 'whatsapp' | 'form' | 'voice' | 'other' }
 *
 * Response 200:
 *   { task: ParsedTask, confidence: number, channel: string, modelo: string }
 *
 * Response 4xx/5xx:
 *   { error: string, detail?: string }
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

interface ParsedTask {
  titulo: string
  descricao: string
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
  categoria: string
  responsavel_id: string | null
  responsavel_nome: string | null
  data_prazo_sugerida: string | null // YYYY-MM-DD ou null
  tempo_estimado_minutos: number | null
  subtasks: string[]
  tags: string[]
  reasoning: string // explicação curta da decisão
}

interface ApiResponse {
  task: ParsedTask
  confidence: number // 0-100
  channel: string
  modelo: string
}

const VALID_PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'] as const

export async function POST(req: Request) {
  // 1. Auth — recurso restrito ao Administrador (gate de UI + servidor)
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  if (user.perfil !== 'Administrador') {
    return NextResponse.json(
      { error: 'Recurso disponível apenas para administradores' },
      { status: 403 },
    )
  }

  // 2. Body
  let body: { message?: string; channel?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const message = (body.message || '').trim()
  const channel = (body.channel || 'other').toLowerCase()
  if (!message) {
    return NextResponse.json({ error: 'Campo "message" obrigatório' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Mensagem excede 5000 caracteres' }, { status: 400 })
  }

  // 3. API key check
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurada no servidor' },
      { status: 500 },
    )
  }

  // 4. Carrega vocabulário do banco (categorias + usuários) pra IA escolher
  //    valores reais. Mantém a resposta amarrada ao schema da empresa.
  try {
    const [categoriesSnap, usersSnap] = await Promise.all([
      adminDb.collection('categories').get(),
      adminDb.collection('users').get(),
    ])
    const categorias = categoriesSnap.docs
      .map(d => (d.data() as { nome?: string }).nome)
      .filter(Boolean) as string[]
    const usuarios = usersSnap.docs.map(d => {
      const u = d.data() as { nome?: string; email?: string; perfil?: string }
      return {
        id: d.id,
        nome: u.nome || '',
        email: u.email || '',
        perfil: u.perfil || '',
      }
    })

    // 5. Monta prompt
    const todayISO = new Date().toISOString().split('T')[0]
    const usuariosList = usuarios
      .map(u => `  - id="${u.id}" nome="${u.nome}" perfil="${u.perfil}"`)
      .join('\n')
    const categoriasList = categorias.map(c => `"${c}"`).join(', ') || '(nenhuma cadastrada)'

    const systemPrompt = `Você é um assistente do Instituto Alfa e Beto (IAB), uma instituição educacional brasileira. Sua função é converter mensagens em linguagem natural (e-mails, anotações, transcrições) em tarefas estruturadas para o sistema de Controle de Atividades.

REGRAS RÍGIDAS:
1. Responda APENAS com um JSON válido — nada de texto antes ou depois, nada de markdown, sem \`\`\`json.
2. O JSON deve ter EXATAMENTE essa estrutura:

{
  "titulo": "FORMATO OBRIGATÓRIO: [Categoria] Verbo + objeto",
  "descricao": "string em HTML simples (use <p>, <ul><li>, <strong>) com contexto e detalhes",
  "prioridade": "Baixa" | "Média" | "Alta" | "Crítica",
  "categoria": "uma das categorias da lista — escolha a mais próxima",
  "responsavel_id": "id de um usuário da lista OU null se não há indicação clara",
  "responsavel_nome": "nome do usuário escolhido OU null",
  "data_prazo_sugerida": "YYYY-MM-DD ou null se não houver indicação no texto",
  "tempo_estimado_minutos": "número inteiro estimado ou null se incerto",
  "subtasks": ["array de strings com passos/checklist sugeridos, máx 5 itens"],
  "tags": ["array de 2-4 strings curtas pra classificar"],
  "reasoning": "string curta (1-2 frases) explicando suas escolhas de prioridade/categoria/responsável",
  "confidence": "número de 0 a 100 indicando sua confiança geral na classificação"
}

3. TÍTULO (regra crítica):
   - FORMATO: [Categoria] Verbo + objeto curto
   - MÁXIMO: 60 caracteres no TOTAL (incluindo o prefixo [...])
   - A categoria entre colchetes DEVE ser exatamente a mesma do campo "categoria" abaixo
   - Use verbo no infinitivo (Revisar, Criar, Organizar, Enviar, Atualizar)
   - Seja CONCISO — sintetize a essência, não repita contexto da descrição
   - Exemplos corretos:
     • "[Avaliação] Revisar relatório anual de impacto"  (47 chars)
     • "[Marketing] Produzir vídeo institucional"  (40 chars)
     • "[Conteúdo] Criar caderno do 1º ano"  (35 chars)
     • "[Formação] Organizar curso de professores"  (41 chars)
   - Exemplos INCORRETOS (longos/sem prefixo):
     • "Revisar o relatório anual de impacto social para apresentação no conselho da fundação"
     • "Tarefa importante de revisar coisas"

4. PRIORIDADE:
   - "Crítica": bloqueia operação, prazo iminente (<24h), risco financeiro/jurídico/imagem
   - "Alta": importante e com prazo curto (<7 dias) ou impacto em várias pessoas
   - "Média": padrão para a maioria das tarefas operacionais
   - "Baixa": melhoria, sugestão, não urgente, sem prazo definido

5. CATEGORIA: escolha apenas dentre estas: ${categoriasList}
   Se nenhuma se aplica claramente, escolha a mais genérica disponível.

6. RESPONSÁVEL: se o texto cita um nome ou função, encontre o usuário correspondente na lista abaixo e retorne seu id. Se não há indicação clara OU o nome não está na lista, retorne null em ambos os campos.

USUÁRIOS DISPONÍVEIS:
${usuariosList || '  (nenhum usuário cadastrado)'}

7. DATA: hoje é ${todayISO}. Se o texto menciona "amanhã", "sexta", "próxima semana", calcule a data ISO. Se não menciona, retorne null.

8. TEMPO ESTIMADO: estime em minutos baseado na complexidade descrita. Tarefa simples = 30-60min, média = 120-240min, complexa = 480min+. null se incerto.

9. DESCRIÇÃO (regra crítica de formatação):
   - O campo aceita HTML rico (TipTap editor). USE FORMATAÇÃO sempre que possível.
   - Tags permitidas: <p>, <h3>, <strong>, <em>, <u>, <ul><li>, <ol><li>, <blockquote>, <code>, <a>
   - REGRAS:
     • SEMPRE comece com 1 parágrafo curto resumindo o contexto/objetivo
     • Se há múltiplas informações/requisitos, use <ul><li> ou <ol><li>
     • Destaque nomes/datas/valores importantes com <strong>
     • Se há prazo ou condição crítica, use <blockquote> ou <strong>
     • Se houver passos numerados, use <ol><li>
     • Se há materiais/itens enumeráveis, use <ul><li>
     • Subtítulos de seção (Materiais, Equipe, Prazo) usam <h3>
     • NÃO repita o título da tarefa na descrição
     • NÃO use texto puro corrido — quebre em estrutura sempre que houver listas/seções
   - EXEMPLO BOM (mensagem original: "Configurar acessos no SIG-IAB pra equipe de Coruripe. Equipe completa: João (gestor), Maria, Pedro. Materiais 1º ano: caligrafia, matemática. Prazo: dia 30."):
     <p>Configurar acessos ao sistema <strong>SIG-IAB</strong> para a equipe do município de Coruripe - AL.</p>
     <h3>Equipe com acesso completo</h3>
     <ul>
       <li><strong>João</strong> (gestor)</li>
       <li>Maria</li>
       <li>Pedro</li>
     </ul>
     <h3>Materiais 1º ano</h3>
     <ul>
       <li>Caligrafia</li>
       <li>Matemática</li>
     </ul>
     <blockquote><strong>Prazo:</strong> dia 30</blockquote>
   - EXEMPLO RUIM (não fazer): "Configurar acessos no SIG-IAB pra equipe de Coruripe. Equipe completa: João (gestor), Maria, Pedro. Materiais 1º ano: caligrafia, matemática. Prazo: dia 30."`

    const userPrompt = `Mensagem recebida via ${channel}:

"""
${message}
"""

Extraia a tarefa em JSON conforme as regras.`

    // 6. Chama Claude
    const client = new Anthropic({ apiKey })
    const modelo = 'claude-sonnet-4-5'
    const response = await client.messages.create({
      model: modelo,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // 7. Extrai e parseia o JSON da resposta
    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Remove cercas de código caso o modelo desobedeça
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

    let parsed: ParsedTask & { confidence?: number }
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[ai-parse] Falha ao parsear JSON:', cleaned)
      return NextResponse.json(
        {
          error: 'IA retornou resposta inválida',
          detail: parseErr instanceof Error ? parseErr.message : 'parse error',
        },
        { status: 502 },
      )
    }

    // 8. Validação e saneamento
    if (!VALID_PRIORIDADES.includes(parsed.prioridade as typeof VALID_PRIORIDADES[number])) {
      parsed.prioridade = 'Média'
    }
    if (parsed.categoria && !categorias.includes(parsed.categoria) && categorias.length > 0) {
      // Categoria fora da lista — assume a primeira
      parsed.categoria = categorias[0]
    }
    if (parsed.responsavel_id && !usuarios.find(u => u.id === parsed.responsavel_id)) {
      // ID inválido — limpa
      parsed.responsavel_id = null
      parsed.responsavel_nome = null
    }
    if (parsed.responsavel_id) {
      const u = usuarios.find(u => u.id === parsed.responsavel_id)
      if (u) parsed.responsavel_nome = u.nome
    }
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
      : 70

    // Garante que o título começa com [Categoria]. Se a IA esqueceu o
    // prefixo, força a inclusão. Se a categoria mudou na sanitização
    // acima, corrige o prefixo. Limite 60 chars.
    let tituloFinal = String(parsed.titulo || '').trim()
    const catRegex = /^\[[^\]]+\]\s*/
    if (parsed.categoria && tituloFinal) {
      if (!catRegex.test(tituloFinal)) {
        // Sem prefixo: adiciona
        tituloFinal = `[${parsed.categoria}] ${tituloFinal}`
      } else {
        // Tem prefixo mas pode estar com categoria errada: força a correta
        tituloFinal = tituloFinal.replace(catRegex, `[${parsed.categoria}] `)
      }
    }
    // Limita a 60 chars preservando o prefixo
    if (tituloFinal.length > 60) {
      tituloFinal = tituloFinal.slice(0, 60).trimEnd()
    }

    const result: ApiResponse = {
      task: {
        titulo: tituloFinal,
        descricao: String(parsed.descricao || ''),
        prioridade: parsed.prioridade,
        categoria: String(parsed.categoria || ''),
        responsavel_id: parsed.responsavel_id || null,
        responsavel_nome: parsed.responsavel_nome || null,
        data_prazo_sugerida: parsed.data_prazo_sugerida || null,
        tempo_estimado_minutos: typeof parsed.tempo_estimado_minutos === 'number'
          ? parsed.tempo_estimado_minutos
          : null,
        subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks.slice(0, 10) : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
        reasoning: String(parsed.reasoning || ''),
      },
      confidence,
      channel,
      modelo,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[ai-parse] Erro:', err)
    const detail = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'Erro ao processar com IA', detail },
      { status: 500 },
    )
  }
}
