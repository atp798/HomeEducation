import { streamChat } from '../api/client'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('streamChat frontend logic', () => {
  let mockFetch: any
  let originalFetch: any

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should handle incoming SSE chunks and call onChunk correctly', async () => {
    const encoder = new TextEncoder()
    let controller: ReadableStreamDefaultController<Uint8Array>
    const stream = new ReadableStream({
      start(c) {
        controller = c
      }
    })

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream
    })

    const onChunk = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    streamChat('test-session', 'hello', onChunk, onDone, onError)

    // Simulate sending multiple chunks
    const chunk1 = 'data: {"text":"He"}\n\n'
    const chunk2 = 'data: {"text":"llo"}\n\n'
    const chunk3 = 'data: [DONE]\n\n'

    // Need to wait slightly to let promises resolve
    controller!.enqueue(encoder.encode(chunk1))
    await new Promise(r => setTimeout(r, 10))
    expect(onChunk).toHaveBeenCalledWith('He')

    controller!.enqueue(encoder.encode(chunk2))
    await new Promise(r => setTimeout(r, 10))
    expect(onChunk).toHaveBeenCalledWith('llo')

    controller!.enqueue(encoder.encode(chunk3))
    controller!.close()
    await new Promise(r => setTimeout(r, 10))
    
    expect(onDone).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('should abort stream when returned abort function is called', async () => {
    const encoder = new TextEncoder()
    let controller: ReadableStreamDefaultController<Uint8Array>
    const stream = new ReadableStream({
      start(c) {
        controller = c
      }
    })

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream
    })

    const onChunk = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    const abort = streamChat('test-session', 'hello', onChunk, onDone, onError)

    const chunk1 = 'data: {"text":"He"}\n\n'
    controller!.enqueue(encoder.encode(chunk1))
    await new Promise(r => setTimeout(r, 10))
    expect(onChunk).toHaveBeenCalledWith('He')

    // Call abort
    abort()

    const chunk2 = 'data: {"text":"llo"}\n\n'
    controller!.enqueue(encoder.encode(chunk2))
    await new Promise(r => setTimeout(r, 10))
    
    // Should not have been called with "llo"
    expect(onChunk).toHaveBeenCalledTimes(1)
    
    // In our current implementation, when we manually abort, it sets aborted=true and stops calling callbacks.
    // It doesn't actually call onDone or onError if aborted manually inside the reading loop if we check correctly.
  })
})