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
    const heading = line.match(/^#{1,4}\s+(.*)$/)
    if (heading) { flush(); blocks.push({ type: 'h', text: heading[1].trim() }); continue }
    const item = line.match(/^(?:([-*•])|(\d+)[.)])\s+(.*)$/)
    if (item) {
      const type = item[2] ? 'ol' : 'ul'
      if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = [] }
      if (list && list.type !== type) { blocks.push(list); list = null }
      list ??= { type, items: [], start: item[2] ? Number(item[2]) : 1 }
      list.items.push(item[3].trim())
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
        ) : b.type === 'ol' ? (
          <ol key={i} className="space-y-2.5" start={b.start}>
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-100 text-[0.7rem] font-bold text-mint-800" aria-hidden>{b.start + j}</span><span>{inline(it, `${i}.${j}`)}</span></li>
            ))}
          </ol>
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
