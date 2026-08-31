'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { CharacterCount, Placeholder } from '@tiptap/extensions';

/**
 * The writing surface for blog posts and pages.
 *
 * Stores HTML, because that is what the website already renders through
 * dangerouslySetInnerHTML — so what is saved here goes straight onto the page
 * with no conversion step.
 *
 * Worth knowing: the document schema is an allowlist. Pasting from Word or a
 * web page keeps the headings, lists and emphasis and silently drops anything
 * else — styles, scripts, tracking markup — because there is no node in the
 * schema to hold them. That is the main reason this is safer than typing raw
 * HTML into a textarea.
 */

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Storage folder for images dropped into the body. */
  folder?: string;
  placeholder?: string;
};

function Button({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="editor__btn"
      onMouseDown={(e) => e.preventDefault()} // keep the selection
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, folder }: { editor: Editor; folder?: string }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const openLink = () => {
    setLinkUrl(editor.getAttributes('link').href ?? '');
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      // Without a scheme the browser treats it as a path on this site.
      const href = /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('/')
        ? url
        : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  async function insertImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      if (folder) body.append('folder', folder);

      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Upload failed.');
      editor.chain().focus().setImage({ src: json.url }).run();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="editor__bar">
      <Button title="Bold (Cmd+B)" active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></Button>
      <Button title="Italic (Cmd+I)" active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></Button>
      <Button title="Underline (Cmd+U)" active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></Button>

      <span className="editor__sep" />

      <Button title="Normal text" active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}>Text</Button>
      <Button title="Heading" active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
      <Button title="Sub-heading" active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button>

      <span className="editor__sep" />

      <Button title="Bulleted list" active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Button>
      <Button title="Numbered list" active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Button>
      <Button title="Quote" active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Button>
      <Button title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</Button>

      <span className="editor__sep" />

      <Button title="Link" active={editor.isActive('link')} onClick={openLink}>Link</Button>
      <Button title="Insert image" disabled={uploading}
        onClick={() => fileInput.current?.click()}>{uploading ? 'Uploading…' : 'Image'}</Button>
      <Button title="Remove formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear</Button>

      <span className="editor__sep" />

      <Button title="Undo (Cmd+Z)" disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}>↶</Button>
      <Button title="Redo (Cmd+Shift+Z)" disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}>↷</Button>

      <input
        ref={fileInput} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); }}
      />

      {linkOpen && (
        <div className="editor__link">
          <input
            type="text" value={linkUrl} autoFocus
            placeholder="https://example.com or /contact/"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
              if (e.key === 'Escape') { e.preventDefault(); setLinkOpen(false); }
            }}
          />
          <button type="button" className="btn btn--ghost" onClick={applyLink}>Apply</button>
          <button type="button" className="btn btn--ghost" onClick={() => setLinkOpen(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export function RichText({ value, onChange, folder, placeholder }: Props) {
  const [source, setSource] = useState(false);

  const editor = useEditor({
    // Next.js renders this on the server first; rendering the editor there too
    // produces a hydration mismatch.
    immediatelyRender: false,
    // v3 does not re-render on every transaction by default, which would leave
    // the toolbar's active states stale.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write the article…' }),
      CharacterCount,
    ],
    content: value || '',
    editorProps: { attributes: { class: 'prose' } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in step when the value is replaced from outside, such as
  // after editing the HTML by hand.
  useEffect(() => {
    if (!editor || source) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // Only when the incoming value changes, not on every editor transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, source]);

  const words = useCallback(() => {
    try { return editor?.storage.characterCount.words() ?? 0; } catch { return 0; }
  }, [editor]);

  if (!editor) {
    return <div className="editor"><div className="editor__area">Loading editor…</div></div>;
  }

  return (
    <div className="editor">
      {!source && <Toolbar editor={editor} folder={folder} />}

      {source ? (
        <textarea
          className="editor__area"
          style={{ width: '100%', border: 0, background: 'transparent', fontFamily: 'monospace', fontSize: '.85rem' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <EditorContent editor={editor} className="editor__area" />
      )}

      <div className="editor__foot">
        <span>{words()} words</span>
        <button
          type="button"
          className="editor__btn"
          onClick={() => setSource((s) => !s)}
          title="Switch between writing and the underlying HTML"
        >
          {source ? '← Visual' : 'HTML ›'}
        </button>
      </div>
    </div>
  );
}
