'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
}

const btnCls = 'px-2 py-1 rounded text-sm font-mono transition-colors hover:bg-purple/20'
const activeCls = 'bg-purple/30 text-white'
const inactiveCls = 'text-[#9B8EC4]'

export function RichEditor({ value, onChange }: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null)
  // Prevents re-setting content when change originated from the editor itself
  const suppressSync = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: 'code-block' } } }),
      Image.configure({ allowBase64: false, HTMLAttributes: { class: 'rich-img' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'rich-link' } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'เริ่มเขียนเนื้อหา... (รองรับ heading, รูปภาพ, ลิงก์, ตาราง)' }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      suppressSync.current = true
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'rich-editor-content focus:outline-none',
      },
    },
  })

  // Sync external value changes (e.g. AI generation) into the editor
  useEffect(() => {
    if (!editor) return
    if (suppressSync.current) { suppressSync.current = false; return }
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  const uploadImage = async (file: File) => {
    if (!editor) return
    const params = new URLSearchParams({ filename: file.name, kind: 'article-content' })
    const res = await fetch(`/api/upload?${params}`, {
      method: 'POST',
      body: file,
      headers: { 'content-type': file.type },
    })
    if (!res.ok) return
    const { url } = await res.json()
    editor.chain().focus().setImage({ src: url }).run()
  }

  const addLink = () => {
    if (!editor) return
    const url = window.prompt('ใส่ URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  if (!editor) return null

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.25)', background: 'rgba(15,13,26,.7)' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b" style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(30,16,48,.6)' }}>

        {/* Headings */}
        {([1,2,3] as const).map(level => (
          <button key={level} type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            className={`${btnCls} ${editor.isActive('heading', { level }) ? activeCls : inactiveCls}`}>
            H{level}
          </button>
        ))}

        <Divider />

        {/* Bold / Italic / Underline / Strike */}
        {[
          { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), style: 'font-bold' },
          { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), style: 'italic' },
          { label: 'U', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), style: 'underline' },
          { label: 'S', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), style: 'line-through' },
        ].map(b => (
          <button key={b.label} type="button" onClick={b.action}
            className={`${btnCls} ${b.active ? activeCls : inactiveCls} ${b.style}`}>
            {b.label}
          </button>
        ))}

        <Divider />

        {/* Align */}
        {[
          { icon: '≡', align: 'left' },
          { icon: '≡', align: 'center' },
          { icon: '≡', align: 'right' },
        ].map(a => (
          <button key={a.align} type="button"
            onClick={() => editor.chain().focus().setTextAlign(a.align).run()}
            className={`${btnCls} ${editor.isActive({ textAlign: a.align }) ? activeCls : inactiveCls}`}
            style={{ letterSpacing: a.align === 'center' ? '2px' : a.align === 'right' ? '4px' : '0' }}>
            {a.icon}
          </button>
        ))}

        <Divider />

        {/* Lists */}
        <button type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btnCls} ${editor.isActive('bulletList') ? activeCls : inactiveCls}`}>
          • List
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${btnCls} ${editor.isActive('orderedList') ? activeCls : inactiveCls}`}>
          1. List
        </button>

        <Divider />

        {/* Quote / Code */}
        <button type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${btnCls} ${editor.isActive('blockquote') ? activeCls : inactiveCls}`}>
          &quot;
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`${btnCls} ${editor.isActive('code') ? activeCls : inactiveCls}`}>
          {'<>'}
        </button>

        <Divider />

        {/* Link / Image */}
        <button type="button" onClick={addLink}
          className={`${btnCls} ${editor.isActive('link') ? activeCls : inactiveCls}`}>
          🔗
        </button>
        <button type="button" onClick={() => imgInputRef.current?.click()}
          className={`${btnCls} ${inactiveCls}`}>
          🖼
        </button>
        <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />

        <Divider />

        {/* Undo / Redo */}
        <button type="button" onClick={() => editor.chain().focus().undo().run()}
          className={`${btnCls} ${inactiveCls}`} disabled={!editor.can().undo()}>↩</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}
          className={`${btnCls} ${inactiveCls}`} disabled={!editor.can().redo()}>↪</button>
      </div>

      {/* Editor area */}
      <div className="p-4" style={{ minHeight: '360px' }}>
        <EditorContent editor={editor} />
      </div>

      {/* Char count */}
      <div className="px-4 py-2 border-t font-mono text-[10px] flex justify-between" style={{ borderColor: 'rgba(124,58,237,.1)', color: 'rgba(155,142,196,.4)' }}>
        <span>{editor.getText().length} ตัวอักษร {editor.getText().length < 1500 ? `(GEO ต้องการ 1,500+)` : '✓'}</span>
        <span style={{ color: editor.getText().length >= 1500 ? '#10B981' : 'inherit' }}>
          {editor.getText().length >= 1500 ? '✓ เนื้อหาครบ' : `ต้องการอีก ${1500 - editor.getText().length}`}
        </span>
      </div>

      <style>{`
        .rich-editor-content { color: #E8E4FF; font-size: 0.9rem; line-height: 1.75; }
        .rich-editor-content h1 { font-size: 1.6rem; font-weight: 700; color: white; margin: 1.2rem 0 0.6rem; }
        .rich-editor-content h2 { font-size: 1.3rem; font-weight: 700; color: white; margin: 1rem 0 0.5rem; }
        .rich-editor-content h3 { font-size: 1.1rem; font-weight: 600; color: white; margin: 0.8rem 0 0.4rem; }
        .rich-editor-content p { margin: 0.5rem 0; }
        .rich-editor-content ul, .rich-editor-content ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .rich-editor-content li { margin: 0.25rem 0; }
        .rich-editor-content blockquote { border-left: 3px solid #7C3AED; padding-left: 1rem; margin: 0.75rem 0; color: #9B8EC4; font-style: italic; }
        .rich-editor-content code { background: rgba(124,58,237,.15); padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.85em; color: #A78BFA; }
        .rich-editor-content .code-block { background: rgba(0,0,0,.4); padding: 1rem; border-radius: 8px; margin: 0.75rem 0; font-family: monospace; font-size: 0.85em; color: #A78BFA; overflow-x: auto; }
        .rich-editor-content .rich-img { max-width: 100%; border-radius: 8px; margin: 0.75rem 0; }
        .rich-editor-content .rich-link { color: #A78BFA; text-decoration: underline; }
        .rich-editor-content .ProseMirror-placeholder { color: rgba(155,142,196,.35); pointer-events: none; }
        .rich-editor-content strong { color: white; font-weight: 700; }
        .rich-editor-content em { font-style: italic; }
      `}</style>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-5 mx-1 flex-shrink-0" style={{ background: 'rgba(124,58,237,.2)' }} />
}
