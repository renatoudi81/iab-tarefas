'use client'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3, Quote, Code, Undo2, Redo2,
  Link as LinkIcon, Unlink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Editor de texto rico baseado em TipTap (ProseMirror).
 *
 * Toolbar enxuta com formatações essenciais: bold/italic/underline/strike,
 * headings H2/H3, lista (bullet/numerada), citação, código inline,
 * link, undo/redo.
 *
 * Armazena/retorna HTML. Para mostrar o conteúdo em preview de tabela/card,
 * use o helper `stripHtml(text)` que remove tags mantendo o texto.
 *
 * Uso:
 *   <RichTextEditor value={form.descricao} onChange={(html) => setForm(...)} />
 */

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

export function RichTextEditor({
  value, onChange, placeholder = 'Comece a digitar...', minHeight = 110, className,
}: Props) {
  // Marca quando a próxima mudança de `value` é eco da NOSSA emissão (onUpdate),
  // pra não re-aplicar setContent — que destruiria a seleção e os "stored marks".
  const isInternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      // StarterKit v3 já inclui Underline e Link como sub-extensões. Adicioná-los
      // de novo registrava os marks `underline`/`link` DUPLICADOS no schema do
      // ProseMirror — fonte de comportamento errático ao aplicar formatação
      // (warning "Duplicate extension names found"). Configuramos o Link aqui.
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: 'text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8]',
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    immediatelyRender: false, // SSR-safe (Next.js)
    editorProps: {
      attributes: {
        class: cn(
          'prose-rich px-3 py-2.5 outline-none',
          'text-[0.875rem] text-[#0F172A] leading-relaxed',
        ),
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true
      const html = editor.getHTML()
      // TipTap retorna '<p></p>' para conteúdo vazio — normalize pra string vazia
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  // Sincroniza conteúdo quando o `value` muda EXTERNAMENTE (ex.: ao abrir modal
  // de edição). Mudanças vindas do próprio editor não devem disparar setContent:
  // isso reposiciona o cursor e os stored marks, fazendo a formatação "saltar"
  // de linha. O ref distingue eco-da-própria-edição de mudança externa.
  useEffect(() => {
    if (!editor) return
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    const current = editor.getHTML()
    const currentNorm = current === '<p></p>' ? '' : current
    const incoming = value || ''
    if (incoming !== currentNorm) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-lg border border-[#E4E4E7] bg-white',
          className,
        )}
        style={{ minHeight: minHeight + 38 }}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[#E4E4E7] bg-white overflow-hidden',
        'focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_4px_var(--primary-glow)]',
        'transition-[border-color,box-shadow] duration-150',
        className,
      )}
    >
      <Toolbar editor={editor} />
      <div className="border-t border-[#F4F4F5]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

/* ─── Toolbar ─────────────────────────────────────────────────── */

function Toolbar({ editor }: { editor: Editor }) {
  const [, force] = useState(0)

  // Re-renderiza a toolbar quando o estado do editor muda (active marks etc.)
  useEffect(() => {
    const cb = () => force((n) => n + 1)
    editor.on('selectionUpdate', cb)
    editor.on('transaction', cb)
    return () => {
      editor.off('selectionUpdate', cb)
      editor.off('transaction', cb)
    }
  }, [editor])

  const handleLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = typeof window !== 'undefined'
      ? window.prompt('URL do link:', previous || 'https://')
      : null
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-[#FAFAFA]">
      <Group>
        <Btn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito (Ctrl+B)"
        >
          <Bold size={13} />
        </Btn>
        <Btn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico (Ctrl+I)"
        >
          <Italic size={13} />
        </Btn>
        <Btn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon size={13} />
        </Btn>
        <Btn
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
        >
          <Strikethrough size={13} />
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Título"
        >
          <Heading2 size={14} />
        </Btn>
        <Btn
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Subtítulo"
        >
          <Heading3 size={14} />
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista com marcadores"
        >
          <List size={14} />
        </Btn>
        <Btn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered size={14} />
        </Btn>
        <Btn
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citação"
        >
          <Quote size={13} />
        </Btn>
        <Btn
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Código inline"
        >
          <Code size={13} />
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          active={editor.isActive('link')}
          onClick={handleLink}
          title="Inserir link"
        >
          <LinkIcon size={13} />
        </Btn>
        {editor.isActive('link') && (
          <Btn
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remover link"
          >
            <Unlink size={13} />
          </Btn>
        )}
      </Group>

      <Divider />

      <Group>
        <Btn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 size={13} />
        </Btn>
      </Group>
    </div>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-[#E4E4E7]" />
}

function Btn({
  children, onClick, active, disabled, title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // não tira foco do editor
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer border-0',
        active
          ? 'bg-[#EFF6FF] text-[#2563EB]'
          : 'bg-transparent text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#0F172A]',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}
    >
      {children}
    </button>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────── */

/**
 * Remove tags HTML mantendo somente o texto.
 * Útil para previews em tabelas/cards (Lista, Kanban).
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  if (typeof window === 'undefined') {
    // SSR fallback: regex simples
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  }
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').trim()
}
