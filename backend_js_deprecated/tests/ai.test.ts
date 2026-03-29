import { streamChatCompletion, ChatMessage } from '../src/services/ai'
import { config } from '../src/config'
import nock from 'nock'

describe('streamChatCompletion', () => {
  beforeEach(() => {
    nock.cleanAll()
  })

  it('should process chunks and call onChunk for each valid SSE data message', (done) => {
    const url = new URL(config.ai.baseUrl)
    const baseUrl = `${url.protocol}//${url.host}`
    const path = url.pathname.endsWith('/chat/completions') ? url.pathname : `${url.pathname}/chat/completions`
    
    const scope = nock(baseUrl)
      .post(path)
      .reply(200, (uri, requestBody) => {
        // Mocking SSE stream
        return [
          'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
          'data: [DONE]\n\n'
        ].join('')
      }, {
        'Content-Type': 'text/event-stream'
      })

    const messages: ChatMessage[] = [{ role: 'user', content: 'test' }]
    const chunks: string[] = []

    streamChatCompletion(
      messages,
      (chunk) => {
        chunks.push(chunk)
      },
      () => {
        try {
          expect(chunks).toEqual(['Hello', ' World'])
          scope.done()
          done()
        } catch (error) {
          done(error)
        }
      },
      (error) => {
        done(error)
      }
    )
  })

  it('should handle API errors correctly', (done) => {
    const url = new URL(config.ai.baseUrl)
    const baseUrl = `${url.protocol}//${url.host}`
    const path = url.pathname.endsWith('/chat/completions') ? url.pathname : `${url.pathname}/chat/completions`

    const scope = nock(baseUrl)
      .post(path)
      .reply(500, 'Internal Server Error')

    streamChatCompletion(
      [],
      () => {},
      () => {
        done(new Error('Should not complete successfully'))
      },
      (error) => {
        try {
          expect(error.message).toContain('AI API error 500')
          scope.done()
          done()
        } catch (e) {
          done(e)
        }
      }
    )
  })
})
