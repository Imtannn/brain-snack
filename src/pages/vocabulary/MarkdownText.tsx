import { Fragment, type ReactNode } from 'react'

/** Renders a small Markdown subset: paragraphs, bullets, **bold**, *italic*. */
export function MarkdownText({ text, className }: { text: string; className?: string }) {
  const blocks = splitBlocks(text)
  if (blocks.length === 0) return null

  return (
    <div className={className ? `vocab-md ${className}` : 'vocab-md'}>
      {blocks.map((block, index) =>
        block.kind === 'list' ? (
          <ul key={index} className="vocab-md__list">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={index} className="vocab-md__p">
            {renderInline(block.text)}
          </p>
        ),
      )}
    </div>
  )
}

type Block = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] }

export function splitBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').trim().split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() })
    paragraph = []
  }
  const flushList = () => {
    if (list.length === 0) return
    blocks.push({ kind: 'list', items: list.slice() })
    list = []
  }

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/)
    if (bullet?.[1]) {
      flushParagraph()
      list.push(bullet[1].trim())
      continue
    }
    if (!line.trim()) {
      flushList()
      flushParagraph()
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }
  flushList()
  flushParagraph()
  return blocks
}

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>)
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  return nodes
}
