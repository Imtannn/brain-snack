import { describe, expect, it } from 'vitest'
import type { QuizQuestion } from '../../vocabulary/types'
import {
  dropSnackFromPacks,
  packMembers,
  questionsForPack,
  snackFromPack,
  toSavedPack,
  unfiledSnacks,
} from '../packRecord'
import type { SavedSnack } from '../snackRecord'

function question(prompt: string, answer: string): QuizQuestion {
  return {
    id: `q-${prompt}`,
    noteId: `n-${prompt}`,
    promptLabel: 'Word',
    prompt,
    correctLabel: answer,
    choices: [
      { id: `c-${prompt}-1`, label: answer, correct: true },
      { id: `c-${prompt}-2`, label: 'no', correct: false },
    ],
    explanation: { summary: `${prompt} means ${answer}.`, usage: '', contrasts: [] },
  }
}

function snack(id: string, title: string, questions: QuizQuestion[] = [question(id, title)]): SavedSnack {
  return {
    id,
    ownerId: 'user-a',
    title,
    rawText: `${id}: ${title}`,
    seconds: 12,
    createdAt: 1,
    questions,
    model: null,
    smartAnswers: false,
    speechLang: 'fr-FR',
  }
}

describe('saved pack records', () => {
  it('keeps unique snack ids and drops an unnamed pack', () => {
    expect(
      toSavedPack('pack-1', {
        ownerId: 'user-a',
        title: '  French verbs  ',
        snackIds: ['aller', 'avoir', 'aller', ''],
        createdAt: 9,
      }),
    ).toEqual({
      id: 'pack-1',
      ownerId: 'user-a',
      title: 'French verbs',
      snackIds: ['aller', 'avoir'],
      createdAt: 9,
    })
    expect(toSavedPack('pack-1', { ownerId: 'user-a', title: '   ', snackIds: [] })).toBeNull()
  })

  it('lists members in pack order and leaves leftovers unfiled', () => {
    const aller = snack('aller', 'ALLER')
    const avoir = snack('avoir', 'AVOIR')
    const loose = snack('loose', 'Café')
    const pack = toSavedPack('pack-1', {
      ownerId: 'user-a',
      title: 'French verbs',
      snackIds: ['avoir', 'missing', 'aller'],
      createdAt: 1,
    })
    if (!pack) throw new Error('expected a pack')
    expect(packMembers(pack, [aller, avoir, loose]).map((item) => item.id)).toEqual(['avoir', 'aller'])
    expect(unfiledSnacks([aller, avoir, loose], [pack]).map((item) => item.id)).toEqual(['loose'])
  })

  it('merges snack questions into one playable pack quiz', () => {
    const aller = snack('aller', 'ALLER', [question('aller', 'to go')])
    const avoir = snack('avoir', 'AVOIR', [question('avoir', 'to have')])
    const pack = toSavedPack('pack-1', {
      ownerId: 'user-a',
      title: 'French verbs',
      snackIds: ['aller', 'avoir'],
      createdAt: 4,
    })
    if (!pack) throw new Error('expected a pack')
    expect(questionsForPack([aller, avoir])).toHaveLength(2)
    const play = snackFromPack(pack, [aller, avoir])
    expect(play?.title).toBe('French verbs')
    expect(play?.id).toBe('pack-play-pack-1')
    expect(play?.questions).toHaveLength(2)
    expect(play?.questions.map((item) => item.prompt).sort()).toEqual(['aller', 'avoir'])
    expect(play?.speechLang).toBe('fr-FR')
    expect(snackFromPack(pack, [])).toBeNull()
  })

  it('builds a pack quiz from several saved lists that were never generated', () => {
    const notes = [
      snack('a', 'one', []),
      snack('b', 'two', []),
      snack('c', 'three', []),
      snack('d', 'four', []),
    ].map((item, index) => ({
      ...item,
      rawText: `word${index}: meaning ${index}`,
    }))
    expect(questionsForPack(notes)).toHaveLength(4)
  })

  it('drops a deleted snack from every pack', () => {
    const pack = toSavedPack('pack-1', {
      ownerId: 'user-a',
      title: 'French verbs',
      snackIds: ['aller', 'avoir'],
      createdAt: 1,
    })
    if (!pack) throw new Error('expected a pack')
    expect(dropSnackFromPacks([pack], 'aller')[0]?.snackIds).toEqual(['avoir'])
  })
})
