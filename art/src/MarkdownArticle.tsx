import { Fragment, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type MarkdownArticleProps = {
  markdown: string;
  onChange: (value: string) => void;
};

const inlinePattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;

const renderInline = (text: string): ReactNode[] => text.split(inlinePattern).filter(part => part !== '').map((part, index) => {
  if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${index}-${part}`} className='font-bold text-slate-950'>{part.slice(2, -2)}</strong>;
  if (part.startsWith('`') && part.endsWith('`')) return <code key={`${index}-${part}`} className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-rose-700'>{part.slice(1, -1)}</code>;
  if (part.startsWith('*') && part.endsWith('*')) return <em key={`${index}-${part}`}>{part.slice(1, -1)}</em>;
  const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  if (link) return <a key={`${index}-${part}`} href={link[2]} target='_blank' rel='noreferrer' className='font-semibold text-blue-600 underline decoration-blue-200 underline-offset-2'>{link[1]}</a>;
  return <Fragment key={`${index}-${part}`}>{part}</Fragment>;
});

const isBlockStart = (line: string) => /^(#{1,3})\s+|^[-*]\s+|^\d+\.\s+|^>\s*|^---+$/.test(line.trim());

const MarkdownPreview = ({ markdown }: { markdown: string }) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (/^###\s+/.test(line)) {
      blocks.push(<h3 key={`h3-${index}`} className='mb-3 mt-7 text-xl font-black leading-snug text-slate-900'>{renderInline(line.replace(/^###\s+/, ''))}</h3>);
      index += 1;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push(<h2 key={`h2-${index}`} className='mb-3 mt-9 border-b border-slate-100 pb-2 text-2xl font-black leading-snug text-slate-950'>{renderInline(line.replace(/^##\s+/, ''))}</h2>);
      index += 1;
      continue;
    }
    if (/^#\s+/.test(line)) {
      blocks.push(<h1 key={`h1-${index}`} className='mb-4 mt-8 text-3xl font-black leading-tight text-slate-950'>{renderInline(line.replace(/^#\s+/, ''))}</h1>);
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(<ul key={`ul-${index}`} className='my-5 list-disc space-y-2 pl-6 text-[16px] leading-7 text-slate-700'>{items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{renderInline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(<ol key={`ol-${index}`} className='my-5 list-decimal space-y-2 pl-6 text-[16px] leading-7 text-slate-700'>{items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{renderInline(item)}</li>)}</ol>);
      continue;
    }
    if (/^>\s*/.test(line)) {
      const quotes: string[] = [];
      while (index < lines.length && /^>\s*/.test(lines[index].trim())) {
        quotes.push(lines[index].trim().replace(/^>\s*/, ''));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`} className='my-6 border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-[16px] italic leading-7 text-slate-700'>{quotes.map((quote, quoteIndex) => <p key={`${quoteIndex}-${quote}`}>{renderInline(quote)}</p>)}</blockquote>);
      continue;
    }
    if (/^---+$/.test(line)) {
      blocks.push(<hr key={`hr-${index}`} className='my-8 border-slate-200' />);
      index += 1;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`p-${index}`} className='my-4 text-[16px] leading-8 text-slate-700'>{renderInline(paragraph.join(' '))}</p>);
  }

  return <article className='min-h-[560px] rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-7'>{blocks.length ? blocks : <p className='text-sm text-slate-400'>Belum ada isi artikel.</p>}</article>;
};

function MarkdownArticle({ markdown, onChange }: MarkdownArticleProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const replaceSelection = (before: string, after: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end) || placeholder;
    const next = `${markdown.slice(0, start)}${before}${selected}${after}${markdown.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const prefixSelection = (prefix: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end) || placeholder;
    const formatted = selected.split('\n').map(line => `${prefix}${line}`).join('\n');
    const next = `${markdown.slice(0, start)}${formatted}${markdown.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => textarea.focus());
  };

  return (
    <div className='mt-5 min-w-0'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2'>
        <div className='flex flex-wrap gap-1.5'>
          <button type='button' onClick={() => setMode('preview')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'preview' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>Preview Artikel</button>
          <button type='button' onClick={() => setMode('edit')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'edit' ? 'bg-slate-950 text-white' : 'bg-white text-slate-600'}`}>Edit Markdown</button>
        </div>
        <div className='text-[11px] font-semibold text-slate-500'>Judul = H1 · ## = H2 · ### = H3 · **teks** = tebal</div>
      </div>
      {mode === 'edit' ? (
        <>
          <div className='mb-2 flex flex-wrap gap-1.5'>
            <button type='button' onClick={() => prefixSelection('## ', 'Subjudul H2')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold'>H2</button>
            <button type='button' onClick={() => prefixSelection('### ', 'Subjudul H3')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold'>H3</button>
            <button type='button' onClick={() => replaceSelection('**', '**', 'teks penting')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black'>Bold</button>
            <button type='button' onClick={() => replaceSelection('*', '*', 'teks miring')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold italic'>Italic</button>
            <button type='button' onClick={() => prefixSelection('- ', 'Poin daftar')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold'>Bullet</button>
            <button type='button' onClick={() => prefixSelection('1. ', 'Langkah')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold'>Numbered</button>
            <button type='button' onClick={() => prefixSelection('> ', 'Kutipan')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold'>Quote</button>
            <button type='button' onClick={() => replaceSelection('`', '`', 'kode')} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold'>Code</button>
          </div>
          <textarea ref={textareaRef} value={markdown} onChange={event => onChange(event.target.value)} className='min-h-[560px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-5 font-mono text-[15px] leading-7 outline-none focus:border-blue-400' spellCheck='true' />
        </>
      ) : <MarkdownPreview markdown={markdown} />}
    </div>
  );
}

export default MarkdownArticle;
