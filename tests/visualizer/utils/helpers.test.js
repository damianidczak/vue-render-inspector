import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../../../src/visualizer/utils/helpers.js'

describe('helpers', () => {
  describe('escapeHtml()', () => {
    it('should escape HTML tags', () => {
      expect(escapeHtml('<div>Hello</div>')).toBe('&lt;div&gt;Hello&lt;/div&gt;')
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert("XSS")&lt;/script&gt;'
      )
    })

    it('should escape HTML entities', () => {
      expect(escapeHtml('&')).toBe('&amp;')
      expect(escapeHtml('<')).toBe('&lt;')
      expect(escapeHtml('>')).toBe('&gt;')
      // Note: textContent doesn't escape quotes in all browsers
      // Just verify they are preserved
      expect(escapeHtml('"')).toContain('"')
      expect(escapeHtml("'")).toContain("'")
    })

    it('should handle complex HTML', () => {
      const input = '<img src="x" onerror="alert(\'XSS\')">'
      const result = escapeHtml(input)
      // Check that the dangerous characters are escaped
      expect(result).toContain('&lt;img')
      expect(result).toContain('&gt;')
      expect(result).not.toContain('<img')
      // The content is escaped, so it can't be executed
      expect(result).toBe('&lt;img src="x" onerror="alert(\'XSS\')"&gt;')
    })

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should handle plain text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World')
      expect(escapeHtml('Component123')).toBe('Component123')
    })

    it('should handle null and undefined gracefully', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    it('should handle numbers', () => {
      expect(escapeHtml(123)).toBe('123')
      expect(escapeHtml(0)).toBe('0')
    })
  })
})
