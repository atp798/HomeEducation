import OpenAI from 'openai';

// OpenAI-compatible client — swap baseURL to use any compatible provider
// (OpenAI / Anthropic proxy / Ollama / Azure / etc.)
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.AI_API_KEY || 'placeholder',
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    });
  }
  return client;
}

const SYSTEM_PROMPT = `你是一位专业的家庭教育咨询师，拥有丰富的儿童心理学、教育学和家庭关系方面的知识。
你的职责是：
1. 耐心倾听家长和孩子的教育问题
2. 提供科学、实用的教育建议
3. 帮助家长建立积极的亲子关系
4. 解答关于学习方法、情绪管理、行为引导等方面的问题
5. 在必要时推荐专业心理咨询

请用温暖、专业、易懂的语言回复，避免使用过于学术化的术语。`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Stream AI response. Yields text chunks.
 * Compatible with any OpenAI-format provider.
 */
export async function* streamAIResponse(
  history: ChatMessage[],
  userMessage: string
): AsyncGenerator<string> {
  const model = process.env.AI_MODEL || 'gpt-4o';

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-20), // Keep last 20 messages for context
    { role: 'user', content: userMessage },
  ];

  const stream = await getClient().chat.completions.create({
    model,
    messages,
    stream: true,
    max_tokens: 2048,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
