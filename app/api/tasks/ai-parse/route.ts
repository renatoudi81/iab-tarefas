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
import { checkRateLimit } from '@/lib/rate-limit'
import { todayStr } from '@/types'

interface ParsedTask {
  titulo: string
  descricao: string
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
  projeto_id: string | null
  projeto_nome: string | null
  tipo_publico: 'Externo' | 'Interno' | null
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

  // 1b. Rate limit — protege o orçamento da Anthropic contra abuso/loop.
  // 20 análises por minuto por usuário.
  const rl = await checkRateLimit(`ai-parse:${user.uid}`, 20, 60_000)
  if (!rl.allowed) {
    const secs = Math.ceil(rl.retryAfterMs / 1000)
    return NextResponse.json(
      { error: `Muitas análises seguidas. Aguarde ${secs}s e tente de novo.` },
      { status: 429, headers: { 'Retry-After': String(secs) } },
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

  // 4. Carrega vocabulário do banco (projetos + categorias + usuários) pra IA
  //    escolher valores reais. Mantém a resposta amarrada ao schema da empresa.
  try {
    // limit() em tudo: cada análise de IA custa reads — sem teto, o custo
    // cresce junto com as coleções. 200 cobre folgado o vocabulário atual.
    const [categoriesSnap, usersSnap, projectsSnap, feedbackSnap] = await Promise.all([
      adminDb.collection('categories').limit(200).get(),
      adminDb.collection('users').limit(200).get(),
      adminDb.collection('projects').limit(200).get(),
      // Últimas 10 correções humanas — aprendizado por contexto (few-shot)
      adminDb.collection('ai_feedback').orderBy('criado_em', 'desc').limit(10).get()
        .catch(() => ({ docs: [] as never[] })),
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
    const projetos = projectsSnap.docs.map(d => ({
      id: d.id,
      nome: (d.data() as { nome?: string }).nome || '',
    }))

    // 5. Monta prompt
    const todayISO = todayStr()
    const usuariosList = usuarios
      .map(u => `  - id="${u.id}" nome="${u.nome}" perfil="${u.perfil}"`)
      .join('\n')
    const categoriasList = categorias.map(c => `"${c}"`).join(', ') || '(nenhuma cadastrada)'
    const projetosList = projetos
      .map(p => `  - id="${p.id}" nome="${p.nome}"`)
      .join('\n') || '  (nenhum projeto cadastrado)'

    // Aprendizado: exemplos de classificações corrigidas por humanos.
    // Ensina o padrão real da operação sem treinar o modelo (few-shot).
    const correcoes = (feedbackSnap.docs as { data: () => Record<string, unknown> }[])
      .map(d => d.data() as { mensagem?: string; final?: { categoria?: string; tipo_publico?: string; canal?: string; prioridade?: string } })
      .filter(c => c.final)
    const aprendizadoBlock = correcoes.length === 0 ? '' : `

APRENDIZADO (classificações validadas/corrigidas por humanos — siga estes padrões):
${correcoes.map((c, i) => {
  const f = c.final || {}
  const msg = (c.mensagem || '').slice(0, 160).replace(/\s+/g, ' ').trim()
  return `${i + 1}. Mensagem: "${msg}"
   → categoria: ${f.categoria || '—'} | público: ${f.tipo_publico || '—'} | canal: ${f.canal || '—'} | prioridade: ${f.prioridade || '—'}`
}).join('\n')}

Use esses exemplos como referência forte: se a mensagem atual for parecida com alguma acima, classifique de forma consistente com a correção humana.`

    const systemPrompt = `Você é um assistente do Instituto Alfa e Beto (IAB), uma instituição educacional brasileira. Sua função é INTERPRETAR mensagens em linguagem natural (e-mails, anotações, transcrições) e PROPOR uma tarefa acionável para o sistema de Controle de Atividades.

FILOSOFIA: você NÃO é um transcritor. Você é um analista que entende a intenção do remetente, identifica o que precisa ser feito, e organiza isso como um chamado claro. Pode (e deve) sintetizar, reduzir verbosidade e reformular — o que importa é preservar a IDEIA CENTRAL e os DADOS ACIONÁVEIS.

REGRAS RÍGIDAS:
1. Responda APENAS com um JSON válido — nada de texto antes ou depois, nada de markdown, sem \`\`\`json.
2. O JSON deve ter EXATAMENTE essa estrutura:

{
  "titulo": "FORMATO OBRIGATÓRIO: [Categoria] Verbo + objeto",
  "descricao": "string em HTML simples (use <p>, <ul><li>, <strong>) com contexto e detalhes",
  "prioridade": "Baixa" | "Média" | "Alta" | "Crítica",
  "projeto_id": "id de um projeto da lista — escolha o mais provável; se só houver 1 projeto, use ele",
  "projeto_nome": "nome do projeto escolhido",
  "tipo_publico": "Externo" | "Interno" | null,
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

5b. PROJETO (obrigatório): escolha o id de um projeto da lista abaixo, o mais
   provável pelo contexto. Se houver só 1 projeto, use ele. Retorne projeto_id e projeto_nome.

PROJETOS DISPONÍVEIS:
${projetosList}

5c. TIPO DE PÚBLICO: classifique a origem do chamado:
   - "Externo": pedido de um cliente/escola/usuário final (dúvida de uso, erro no sistema, cobrança, etc.)
   - "Interno": demanda entre equipes internas (TI, financeiro, pedagógico, comercial, gerencial)
   - null se não for possível inferir com clareza

6. RESPONSÁVEL: se o texto cita um nome ou função, encontre o usuário correspondente na lista abaixo e retorne seu id. Se não há indicação clara OU o nome não está na lista, retorne null em ambos os campos.

USUÁRIOS DISPONÍVEIS:
${usuariosList || '  (nenhum usuário cadastrado)'}

7. DATA: hoje é ${todayISO}. Se o texto menciona "amanhã", "sexta", "próxima semana", calcule a data ISO. Se não menciona, retorne null.

8. TEMPO ESTIMADO: estime em minutos baseado na complexidade descrita. Tarefa simples = 30-60min, média = 120-240min, complexa = 480min+. null se incerto.

9. DESCRIÇÃO (regra crítica — interpretação + síntese + formatação):

   COMPORTAMENTO ESPERADO:
   - INTERPRETE o texto: identifique o que precisa ser feito, quem está envolvido,
     prazos, materiais, condições. Filtre saudações, agradecimentos, justificativas
     longas e digressões — fique só com o essencial pra execução.
   - SINTETIZE com liberdade: se a mensagem tem 500 palavras enroladas, sua
     descrição pode ter 60 palavras estruturadas. Se o remetente repete a mesma
     informação 3 vezes em formas diferentes, escreva 1 vez.
   - REFORMULE pra clareza: troque jargões e frases ambíguas por linguagem
     direta. Use voz ativa, verbos no infinitivo ou imperativo.
   - PRESERVE 100% dos dados acionáveis: nomes próprios, datas, números,
     materiais específicos, sistemas citados, condições. Nunca invente.

   FORMATO (HTML rico, compatível com TipTap):
   - Tags permitidas: <p>, <h3>, <strong>, <em>, <u>, <ul><li>, <ol><li>, <blockquote>, <code>, <a>
   - Comece com 1 parágrafo curto que dá o contexto/objetivo (1-2 frases)
   - Use <h3> pra agrupar blocos quando há mais de 1 tema (Equipe, Materiais, Prazo)
   - Use <ul><li> pra listas de itens; <ol><li> pra passos sequenciais
   - Destaque com <strong>: nomes próprios, datas críticas, sistemas, valores
   - Use <blockquote> pra prazos absolutos ou condições bloqueantes
   - NÃO repita o título da tarefa
   - NÃO comece com "Olá", "Bom dia", "Conforme conversamos" — vá direto ao ponto
   - NÃO use texto corrido se houver 3+ itens enumeráveis

   EXEMPLO — Síntese e reformulação (não copia literal):

   Texto original (174 palavras):
   "Oi Renato, tudo bem? Espero que sim. Estou te escrevendo porque preciso da
   sua ajuda com uma coisa importante. A gente combinou com o pessoal da equipe
   pedagógica de Coruripe que ia configurar uns acessos pra eles no sistema
   SIG-IAB, lembra? Então, conforme combinado, segue a lista de quem precisa
   ter acesso completo: o João, que é o gestor da equipe, a Maria e o Pedro.
   Eles estão identificados em vermelho na aba 'dados do município'. Outra
   coisa: a gente também precisa configurar quais materiais eles vão poder
   ver. Pro 1º ano, são os de Alfabetização: Caligrafia, Aprender a Ler,
   Matemática, Ciências, Minilivros, Livro Gigante. Pro 2º ano, materiais do
   Ensino Estruturado I Semestre: Livro A, Matemática volumes I e II,
   Ciências, Jogos e Atividades. Tem que estar pronto até dia 30 do mês que
   vem. Pode ser? Qualquer dúvida me avisa. Abraço!"

   Descrição gerada (39 palavras, HTML):
   <p>Configurar acessos no <strong>SIG-IAB</strong> para a equipe pedagógica de Coruripe (identificada em vermelho na aba 'dados do município').</p>
   <h3>Equipe com acesso completo</h3>
   <ul>
     <li><strong>João</strong> (gestor)</li>
     <li>Maria</li>
     <li>Pedro</li>
   </ul>
   <h3>Materiais a liberar</h3>
   <ul>
     <li><strong>1º ano</strong> — Alfabetização: Caligrafia, Aprender a Ler, Matemática, Ciências, Minilivros, Livro Gigante</li>
     <li><strong>2º ano</strong> — Ensino Estruturado I Semestre: Livro A, Matemática (I e II), Ciências, Jogos e Atividades</li>
   </ul>
   <blockquote><strong>Prazo:</strong> dia 30 do mês seguinte</blockquote>

   Note como a descrição:
   - Pulou "Oi Renato, tudo bem", "Conforme combinado", "Pode ser?"
   - Resumiu "preciso da sua ajuda com uma coisa importante" → o título já diz
   - Manteve TODOS os nomes, materiais e o prazo
   - Reorganizou em seções claras pra leitura rápida${aprendizadoBlock}`

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
      max_tokens: 2000,
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
    // Projeto: valida id; se inválido/ausente e há projetos, assume o primeiro
    const projMatch = projetos.find(p => p.id === parsed.projeto_id)
    if (!projMatch) {
      parsed.projeto_id = projetos[0]?.id || null
      parsed.projeto_nome = projetos[0]?.nome || null
    } else {
      parsed.projeto_nome = projMatch.nome
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
    // Tipo de público: só aceita os 2 valores válidos
    if (parsed.tipo_publico !== 'Externo' && parsed.tipo_publico !== 'Interno') {
      parsed.tipo_publico = null
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
        projeto_id: parsed.projeto_id || null,
        projeto_nome: parsed.projeto_nome || null,
        tipo_publico: parsed.tipo_publico,
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
