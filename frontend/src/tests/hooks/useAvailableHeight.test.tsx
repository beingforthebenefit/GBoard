import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAvailableHeight } from '../../hooks/useAvailableHeight.js'

describe('useAvailableHeight', () => {
  it('returns a ref and initial height of 0', () => {
    const { result } = renderHook(() => useAvailableHeight<HTMLDivElement>())

    expect(result.current.ref).toBeDefined()
    expect(result.current.height).toBe(0)
  })

  it('ref is initially null (not yet attached to DOM element)', () => {
    const { result } = renderHook(() => useAvailableHeight<HTMLDivElement>())

    expect(result.current.ref.current).toBeNull()
  })

  it('returns stable ref object across re-renders', () => {
    const { result, rerender } = renderHook(() => useAvailableHeight<HTMLDivElement>())

    const firstRef = result.current.ref
    rerender()
    expect(result.current.ref).toBe(firstRef)
  })

  it('returns height of 0 when ResizeObserver is not triggered (jsdom)', () => {
    // jsdom does not implement real layout, so ResizeObserver never fires
    // useAvailableHeight should remain at 0 height in this environment
    const { result } = renderHook(() => useAvailableHeight<HTMLDivElement>())

    expect(result.current.height).toBe(0)
  })

  it('works without throwing when ref is attached to a div', () => {
    const { result } = renderHook(() => useAvailableHeight<HTMLDivElement>())

    // Simulate attaching the ref manually (no layout computed in jsdom)
    const div = document.createElement('div')
    // Cast through unknown to avoid importing React just for the type
    ;(result.current.ref as { current: HTMLDivElement | null }).current = div

    // Height stays 0 in jsdom as ResizeObserver has no real layout engine
    expect(result.current.height).toBe(0)
  })
})
