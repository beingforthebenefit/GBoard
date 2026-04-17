import { describe, it, expect } from 'vitest'
import { useRef } from 'react'
import { renderHook } from '@testing-library/react'
import { useElementSize } from '../../hooks/useElementSize.js'

describe('useElementSize', () => {
  it('returns null when the ref is not attached to a sized element', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      return useElementSize(ref)
    })

    expect(result.current).toBeNull()
  })

  it('reads clientWidth/clientHeight on mount and applies devicePixelRatio', () => {
    const div = document.createElement('div')
    Object.defineProperty(div, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 600, configurable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })

    const ref = { current: div }
    const { result } = renderHook(() => useElementSize(ref))

    expect(result.current).toEqual({ width: 1600, height: 1200 })
  })

  it('rounds up via Math.ceil to avoid sub-pixel under-requests', () => {
    const div = document.createElement('div')
    Object.defineProperty(div, 'clientWidth', { value: 100, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 1.5, configurable: true })

    const ref = { current: div }
    const { result } = renderHook(() => useElementSize(ref))

    expect(result.current).toEqual({ width: 150, height: 150 })
  })

  it('ignores zero-sized elements', () => {
    const div = document.createElement('div')
    Object.defineProperty(div, 'clientWidth', { value: 0, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 0, configurable: true })

    const ref = { current: div }
    const { result } = renderHook(() => useElementSize(ref))

    expect(result.current).toBeNull()
  })

  it('defaults devicePixelRatio to 1 if not set', () => {
    const div = document.createElement('div')
    Object.defineProperty(div, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true })

    const ref = { current: div }
    const { result } = renderHook(() => useElementSize(ref))

    expect(result.current).toEqual({ width: 400, height: 300 })
  })
})
