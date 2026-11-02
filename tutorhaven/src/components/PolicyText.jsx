import { Fragment } from 'react'

// Renders policy text written in a tiny format: "## " headings, "- " bullets,
// blank lines between paragraphs and **bold**. Emails become mailto links.
// Plain React elements only, so admin-entered text can never inject HTML.

function inline(text, key = '') {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${key}b${i}`} className="font-semibold text-navy-900">{linkify(part.slice(2, -2), `${key}b${i}`)}</strong>
    }
    return <Fragment key={`${key}t${i}`}>{linkify(part, `${key}t${i}`)}</Fragment>
  })
}

function linkify(text, key) {
  return text.split(/([\w.+-]+@[\w-]+\.[\w.-]*\w)/g).map((part, i) =>
    i % 2 ? <a key={`${key}e${i}`} href={`mailto:${part}`} className="font-medium text-mint-700 underline underline-offset-2">{part}</a> : part,
  )
}

export function parsePolicy(text = '') {
  const blocks = []
  let para = []
  let list = null
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') })
    para = []
    if (list) blocks.push(list)
    list = null
  }
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (line.startsWith('## ')) { flush(); blocks.push({ type: 'h', text: line.slice(3).trim() }); continue }
    if (/^[-*] /.test(line)) {
      if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = [] }
      list ??= { type: 'ul', items: [] }
      list.items.push(line.slice(2).trim())
      continue
    }
    if (list) { blocks.push(list); list = null }
    para.push(line)
  }
  flush()
  return blocks
}

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function PolicyText({ text, className = '' }) {
  const blocks = parsePolicy(text)
  return (
    <div className={`space-y-4 text-[0.97rem] leading-relaxed text-navy-700 ${className}`}>
      {blocks.map((b, i) =>
        b.type === 'h' ? (
          <h2 key={i} id={slug(b.text)} className="scroll-mt-28 pt-4 text-xl font-semibold text-navy-950">{b.text}</h2>
        ) : b.type === 'ul' ? (
          <ul key={i} className="space-y-2.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-3"><span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-mint-500" aria-hidden /><span>{inline(it, `${i}.${j}`)}</span></li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.text, String(i))}</p>
        ),
      )}
    </div>
  )
}
