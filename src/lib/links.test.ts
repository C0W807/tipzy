import { describe, expect, it } from 'vitest'
import { cleanHandleInput, handleProblem, recipientFromLink, roleLine, suggestHandle, tipUrl } from './links'

describe('handles', () => {
  it('tidies input as it is typed', () => {
    expect(cleanHandleInput('@Maya Chen')).toBe('maya-chen')
    expect(cleanHandleInput('jo__b!!')).toBe('jo-b')
  })

  it('validates', () => {
    expect(handleProblem('ab')).toMatch(/At least/)
    expect(handleProblem('-maya')).toMatch(/hyphen/)
    expect(handleProblem('maya-chen')).toBeNull()
  })

  it('suggests one from a name', () => {
    expect(suggestHandle('Siobhán O’Neill')).toBe('siobhan-o-neill')
    expect(suggestHandle('Al')).toBe('')
  })
})

describe('tip links', () => {
  const profile = { handle: 'maya-chen', name: 'Maya Chen', role: 'Barista', venue: 'Kin Coffee' }

  it('carries name and role so the page works with no shared database', () => {
    const url = tipUrl('https://example.com/tipzy', profile)
    expect(url).toBe('https://example.com/tipzy/t/maya-chen?n=Maya+Chen&r=Barista+at+Kin+Coffee')
  })

  it('round-trips through the tip page', () => {
    const url = new URL(tipUrl('https://example.com/', profile))
    expect(recipientFromLink('maya-chen', url.search)).toEqual({ handle: 'maya-chen', name: 'Maya Chen', role: 'Barista at Kin Coffee' })
  })

  it('falls back to the handle when the name is missing, and rejects bad handles', () => {
    expect(recipientFromLink('maya', '')).toEqual({ handle: 'maya', name: '@maya', role: '' })
    expect(recipientFromLink('a', '?n=A')).toBeNull()
  })

  it('joins role and venue', () => {
    expect(roleLine('Barber', '')).toBe('Barber')
    expect(roleLine('', 'Fade Room')).toBe('Fade Room')
  })
})
