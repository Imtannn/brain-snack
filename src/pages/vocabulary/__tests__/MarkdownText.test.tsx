import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownText, splitBlocks } from '../MarkdownText'

describe('MarkdownText', () => {
  it('renders bold and italic inline markdown', () => {
    render(<MarkdownText text={'For **"I\'m sorry"** try *Es tut mir leid*.'} />)
    expect(screen.getByText(`"I'm sorry"`).tagName).toBe('STRONG')
    expect(screen.getByText('Es tut mir leid').tagName).toBe('EM')
    expect(document.body.textContent).not.toContain('**')
  })

  it('groups bullet lines into a list', () => {
    const blocks = splitBlocks('Lead-in\n* one\n* two\n\nAfter')
    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'Lead-in' },
      { kind: 'list', items: ['one', 'two'] },
      { kind: 'paragraph', text: 'After' },
    ])
  })
})
