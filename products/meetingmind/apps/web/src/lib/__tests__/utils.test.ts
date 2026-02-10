import { describe, it, expect } from 'vitest'
import { formatTimestamp, parseTimestamp, cn } from '../utils'

describe('utils', () => {
  describe('formatTimestamp', () => {
    it('formats seconds to MM:SS', () => {
      expect(formatTimestamp(0)).toBe('00:00')
      expect(formatTimestamp(65)).toBe('01:05')
      expect(formatTimestamp(923)).toBe('15:23')
    })
  })

  describe('parseTimestamp', () => {
    it('parses MM:SS to seconds', () => {
      expect(parseTimestamp('00:00')).toBe(0)
      expect(parseTimestamp('01:05')).toBe(65)
      expect(parseTimestamp('15:23')).toBe(923)
    })
  })

  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('bg-blue-500', 'text-white')).toBe('bg-blue-500 text-white')
    })

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', 'show')).toBe('base show')
    })
  })
})
