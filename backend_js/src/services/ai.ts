import https from 'https'
import http from 'http'
import { config } from '../config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `你是一位专业的家庭教育咨询师，拥有丰富的儿童教育、亲子关系和家庭发展经验。你能够：
1. 帮助家长了解不同年龄段孩子的发展规律和特点
2. 提供个性化的家庭教育建议和策略
3. 解答关于学习方法、行为管理、情绪引导等问题
4. 分析家庭互动模式，提供改善亲子关系的建议
5. 推荐适合不同孩子的教育资源和活动

请用温暖、专业、易懂的语言回答问题，多用具体案例和实用建议。`

/**
 * Stream a chat completion from the AI API using native http/https.
 *
 * We deliberately avoid Node.js built-in fetch (undici) here because it
 * auto-decompresses gzip responses, which requires buffering the entire
 * compressed payload before decompression — this completely breaks SSE
 * streaming.  Using http.request with `Accept-Encoding: identity` gives
 * us a raw, unbuffered, chunk-by-chunk stream.
 *
 * Some models (e.g. Doubao Seed) have a "reasoning" phase where they send
 * `delta.reasoning_content` before outputting `delta.content`. We forward
 * both to the caller so the frontend can show a "thinking" indicator.
 */
export function streamChatCompletion(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  onReasoning?: (text: string) => void,
): void {
  const allMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ]

  const endpoint = config.ai.baseUrl.endsWith('/chat/completions')
    ? config.ai.baseUrl
    : `${config.ai.baseUrl}/chat/completions`

  const url = new URL(endpoint)
  const body = JSON.stringify({
    model: config.ai.model,
    messages: allMessages,
    stream: true,
    max_tokens: 2000,
    temperature: 0.7,
  })

  const client = url.protocol === 'https:' ? https : http
  let done = false

  const finish = () => {
    if (done) return
    done = true
    onDone()
  }

  const fail = (err: Error) => {
    if (done) return
    done = true
    onError(err)
  }

  const req = client.request(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
        Accept: 'text/event-stream',
        'Accept-Encoding': 'identity',          // No gzip — critical for streaming
        'Content-Length': Buffer.byteLength(body),
      },
    },
    (res) => {
      if (res.statusCode !== 200) {
        let errorBody = ''
        res.on('data', (chunk) => { errorBody += chunk })
        res.on('end', () => fail(new Error(`AI API error ${res.statusCode}: ${errorBody}`)))
        return
      }

      res.setEncoding('utf8')
      let buffer = ''

      res.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            finish()
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (delta?.content !== undefined) onChunk(delta.content)
            if (delta?.reasoning_content && onReasoning) onReasoning(delta.reasoning_content)
          } catch {
            // skip malformed chunks
          }
        }
      })

      res.on('end', finish)
      res.on('error', fail)
    },
  )

  req.on('error', fail)
  req.write(body)
  req.end()
}
