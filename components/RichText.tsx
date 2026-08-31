'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { IMAGE_MAX_MB } from '@/lib/env';

/**
 * Writing surface for blog posts and pages.
 *
 * Content is stored as HTML, which is what the website already renders through
 * dangerouslySetInnerHTML, so what comes out of here drops straight into the
 * existing `.prose` styles with nothing to convert.
 *
 * Worth knowing: the editor keeps only the marks and nodes configured below.
 * Paste a page out of Word or a website and the wrapper divs, inline styles,
 * font tags and any <script> are dropped on the way in — the schema has no
 * place to put them. That is the paste cleanup a plain textarea never did.
 */

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function Btn({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className="editor__btn"
      // A toolbar button must never submit the form it sits inside.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={active ?? false}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, folder }: { editor: Editor; folder?: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openLink = () => {
    setLinkValue(editor.getAttributes('link').href ?? '');
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = linkValue.trim();
    if (href === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      // Same reasoning as the social fields: a bare domain would otherwise be
      // treated as a path relative to the article.
      const url = /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/')
        ? href
        : `https://${href}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkOpen(false);
  };

  async function insertImage(file: File) {
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${IMAGE_MAX_MB}MB.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      if (folder) body.append('folder', folder);

      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed.');

      editor.chain().focus().setImage({ src: json.url, alt: '' }).run();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <>
      <div className="editor__bar">
        <Btn title="Paragraph" active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}>¶</Btn>
        <Btn title="Heading" active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
        <Btn title="Subheading" active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>

        <span className="editor__sep" />

        <Btn title="Bold" active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></Btn>
        <Btn title="Italic" active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></Btn>
        <Btn title="Underline" active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></Btn>

        <span className="editor__sep" />

        <Btn title="Bulleted list" active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
        <Btn title="Quote" active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Btn>
        <Btn title="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</Btn>

        <span className="editor__sep" />

        <Btn title="Link" active={editor.isActive('link')} onClick={openLink}>Link</Btn>
        <Btn title="Insert image" disabled={busy}
          onClick={() => fileInput.current?.click()}>{busy ? 'Uploading…' : 'Image'}</Btn>

        <span className="editor__sep" />

        <Btn title="Undo" disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>↶</Btn>
        <Btn title="Redo" disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>↷</Btn>
        <Btn title="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear</Btn>

        <input
          ref={fileInput} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); }}
        />
      </div>

      {linkOpen && (
        <div className="editor__bar">
          <div className="editor__link">
            <input
              type="text" value={linkValue} autoFocus
              placeholder="https://example.com or /contact/"
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                if (e.key === 'Escape') { e.preventDefault(); setLinkOpen(false); }
              }}
            />
            <button type="button" className="btn btn--primary" onClick={applyLink}>Apply</button>
            <button type="button" className="btn btn--ghost" onClick={() => setLinkOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div className="notice notice--error">{error}</div>}
    </>
  );
}

export function RichText({
  value, onChange, placeholder, folder,
}: {
  value: string;
  /** Receives the document as HTML on every edit. */
  onChange: (html: string) => void;
  placeholder?: string;
  /** Storage folder for images inserted into the article. */
  folder?: string;
}) {

  const editor = useEditor({
    // Required in the App Router: rendering immediately on the server produces
    // markup the client then disagrees with, and React reports a hydration
    // mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write the article…' }),
    ],
    content: value,
    editorProps: { attributes: { class: 'prose' } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  // Keep the editor in step if the row is replaced under it, e.g. after a save
  // redirects back with fresh data. Skipped while focused, so it never fights
  // someone mid-sentence.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  const words = useCallback(() => {
    const text = editor?.getText() ?? '';
    const n = text.trim() ? text.trim().split(/\s+/).length : 0;
    return `${n} word${n === 1 ? '' : 's'}`;
  }, [editor]);

  return (
    <div className="editor">
      {editor && <Toolbar editor={editor} folder={folder} />}
      <div className="editor__area">
        <EditorContent editor={editor} />
      </div>
      <div className="editor__foot">
        <span>{editor ? words() : 'Loading…'}</span>
        <span>Formatting is kept; pasted styling is cleaned up.</span>
      </div>
    </div>
  );
}
