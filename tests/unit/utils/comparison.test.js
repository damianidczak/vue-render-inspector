/**
 * Unit Tests for Comparison Utilities
 * Tests shallow/deep equality and diff computation
 */

import { describe, it, expect } from 'vitest'
import {
  shallowEqual,
  isDeepEqual,
  computeDiff,
  hasDifferentReferenceButSameContent
} from '../../../src/utils/comparison.js'

describe('Comparison Utilities - Unit Tests', () => {
  describe('shallowEqual', () => {
    it('should return true for identical primitive values', () => {
      expect(shallowEqual(5, 5)).toBe(true)
      expect(shallowEqual('hello', 'hello')).toBe(true)
      expect(shallowEqual(true, true)).toBe(true)
      expect(shallowEqual(null, null)).toBe(true)
      expect(shallowEqual(undefined, undefined)).toBe(true)
    })

    it('should return false for different primitive values', () => {
      expect(shallowEqual(5, 10)).toBe(false)
      expect(shallowEqual('hello', 'world')).toBe(false)
      expect(shallowEqual(true, false)).toBe(false)
      expect(shallowEqual(null, undefined)).toBe(false)
    })

    it('should return true for same object reference', () => {
      const obj = { a: 1, b: 2 }
      expect(shallowEqual(obj, obj)).toBe(true)
    })

    it('should return true for objects with same shallow properties', () => {
      const obj1 = { a: 1, b: 2, c: 'hello' }
      const obj2 = { a: 1, b: 2, c: 'hello' }
      expect(shallowEqual(obj1, obj2)).toBe(true)
    })

    it('should return false for objects with different property values', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 3 }
      expect(shallowEqual(obj1, obj2)).toBe(false)
    })

    it('should return false for objects with different property counts', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 2, c: 3 }
      expect(shallowEqual(obj1, obj2)).toBe(false)
    })

    it('should return false for objects with different property names', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, c: 2 }
      expect(shallowEqual(obj1, obj2)).toBe(false)
    })

    it('should handle nested objects shallowly', () => {
      const nested1 = { x: 1 }
      const nested2 = { x: 1 }
      const obj1 = { a: nested1 }
      const obj2 = { a: nested2 }

      expect(shallowEqual(obj1, obj2)).toBe(false) // Different references

      const obj3 = { a: nested1 }
      expect(shallowEqual(obj1, obj3)).toBe(true) // Same reference
    })

    it('should handle arrays shallowly', () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false)
    })

    it('should handle mixed types', () => {
      expect(shallowEqual({}, [])).toBe(false)
      expect(shallowEqual(null, {})).toBe(false)
      expect(shallowEqual(undefined, null)).toBe(false)
    })
  })

  describe('isDeepEqual', () => {
    it('should return true for deeply equal objects', () => {
      const obj1 = { a: { b: { c: 1 } }, d: [1, 2, { e: 3 }] }
      const obj2 = { a: { b: { c: 1 } }, d: [1, 2, { e: 3 }] }
      expect(isDeepEqual(obj1, obj2)).toBe(true)
    })

    it('should return false for deeply different objects', () => {
      const obj1 = { a: { b: { c: 1 } } }
      const obj2 = { a: { b: { c: 2 } } }
      expect(isDeepEqual(obj1, obj2)).toBe(false)
    })

    it('should handle circular references', () => {
      const obj1 = { a: 1 }
      obj1.self = obj1

      const obj2 = { a: 1 }
      obj2.self = obj2

      // For circular references, we expect the function to detect them and handle gracefully
      // Note: This is a complex comparison, the result depends on the implementation
      const result = isDeepEqual(obj1, obj2)
      expect(typeof result).toBe('boolean') // Should not throw
    })

    it('should handle Date objects', () => {
      const date1 = new Date('2023-01-01')
      const date2 = new Date('2023-01-01')
      const date3 = new Date('2023-01-02')

      expect(isDeepEqual(date1, date2)).toBe(true)
      expect(isDeepEqual(date1, date3)).toBe(false)
    })

    it('should handle RegExp objects', () => {
      const regex1 = /test/gi
      const regex2 = /test/gi
      const regex3 = /test/g

      expect(isDeepEqual(regex1, regex2)).toBe(true)
      expect(isDeepEqual(regex1, regex3)).toBe(false)
    })

    it('should handle functions', () => {
      const fn1 = () => 'test'
      const fn2 = () => 'test'

      expect(isDeepEqual(fn1, fn1)).toBe(true) // Same reference
      expect(isDeepEqual(fn1, fn2)).toBe(false) // Different references
    })

    it('should handle arrays deeply', () => {
      const arr1 = [1, [2, [3, 4]], { a: 5 }]
      const arr2 = [1, [2, [3, 4]], { a: 5 }]
      const arr3 = [1, [2, [3, 5]], { a: 5 }]

      expect(isDeepEqual(arr1, arr2)).toBe(true)
      expect(isDeepEqual(arr1, arr3)).toBe(false)
    })
  })

  describe('computeDiff', () => {
    it('should detect added properties', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 1, b: 2 }

      const diff = computeDiff(obj1, obj2)

      expect(diff.added).toEqual({ b: 2 })
      expect(diff.removed).toEqual({})
      expect(diff.changed).toEqual({})
    })

    it('should detect removed properties', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1 }

      const diff = computeDiff(obj1, obj2)

      expect(diff.added).toEqual({})
      expect(diff.removed).toEqual({ b: 2 })
      expect(diff.changed).toEqual({})
    })

    it('should detect changed properties', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 3 }

      const diff = computeDiff(obj1, obj2)

      expect(diff.added).toEqual({})
      expect(diff.removed).toEqual({})
      expect(diff.changed).toEqual({
        b: { from: 2, to: 3, deepEqual: false, sameReference: false }
      })
    })

    it('should detect reference changes with same content', () => {
      const config1 = { theme: 'dark' }
      const config2 = { theme: 'dark' }
      const obj1 = { config: config1 }
      const obj2 = { config: config2 }

      const diff = computeDiff(obj1, obj2)

      expect(diff.changed.config.from).toEqual({ theme: 'dark' })
      expect(diff.changed.config.to).toEqual({ theme: 'dark' })
      expect(diff.changed.config.deepEqual).toBe(true)
      expect(diff.changed.config.sameReference).toBe(false)
    })

    it('should handle null and undefined values', () => {
      const obj1 = { a: null, b: undefined }
      const obj2 = { a: undefined, b: null }

      const diff = computeDiff(obj1, obj2)

      expect(diff.changed.a.from).toBeNull()
      expect(diff.changed.a.to).toBeUndefined()
      expect(diff.changed.b.from).toBeUndefined()
      expect(diff.changed.b.to).toBeNull()
    })

    it('should handle empty objects', () => {
      const diff = computeDiff({}, {})

      expect(diff.added).toEqual({})
      expect(diff.removed).toEqual({})
      expect(diff.changed).toEqual({})
    })

    it('should handle complex nested changes', () => {
      const obj1 = { user: { name: 'John', age: 30 }, items: [1, 2] }
      const obj2 = { user: { name: 'Jane', age: 30 }, items: [1, 2, 3] }

      const diff = computeDiff(obj1, obj2)

      expect(diff.changed.user.deepEqual).toBe(false)
      expect(diff.changed.items.deepEqual).toBe(false)
    })
  })

  describe('hasDifferentReferenceButSameContent', () => {
    it('should return true for objects with same content but different references', () => {
      const obj1 = { a: 1, b: { c: 2 } }
      const obj2 = { a: 1, b: { c: 2 } }

      expect(hasDifferentReferenceButSameContent(obj1, obj2)).toBe(true)
    })

    it('should return false for same reference', () => {
      const obj = { a: 1, b: 2 }

      expect(hasDifferentReferenceButSameContent(obj, obj)).toBe(false)
    })

    it('should return false for different content', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 3 }

      expect(hasDifferentReferenceButSameContent(obj1, obj2)).toBe(false)
    })

    it('should return false for primitive values', () => {
      expect(hasDifferentReferenceButSameContent('hello', 'hello')).toBe(false)
      expect(hasDifferentReferenceButSameContent(42, 42)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(hasDifferentReferenceButSameContent(null, null)).toBe(false)
      expect(hasDifferentReferenceButSameContent(undefined, undefined)).toBe(false)
      expect(hasDifferentReferenceButSameContent(null, undefined)).toBe(false)
    })

    it('should handle arrays correctly', () => {
      const arr1 = [1, 2, { a: 3 }]
      const arr2 = [1, 2, { a: 3 }]

      expect(hasDifferentReferenceButSameContent(arr1, arr2)).toBe(true)
    })

    it('should handle mixed types', () => {
      expect(hasDifferentReferenceButSameContent({}, [])).toBe(false)
      expect(hasDifferentReferenceButSameContent([], {})).toBe(false)
    })
  })
})
