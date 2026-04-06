import json
import httpx
from typing import AsyncGenerator, Callable, Optional
from config import config

SYSTEM_PROMPT = """你是一位专业的家庭教育咨询师，拥有丰富的儿童教育、亲子关系和家庭发展经验。你的职责是：
1. 倾听家长的困惑和问题，提供专业、温暖的建议
2. 根据儿童发展心理学和教育学原理，给出具体可行的指导
3. 帮助家长理解孩子的行为和需求
4. 支持家庭关系的健康发展
5. 在必要时推荐专业资源

请用温和、专业的语气回应，避免过于学术化的表达，让家长感到被理解和支持。"""


def _get_endpoint() -> str:
    url = config.ai_base_url
    if url.endswith("/chat/completions"):
        return url
    return url.rstrip("/") + "/chat/completions"


async def stream_chat_completion(
    messages: list[dict],
    on_chunk: Callable[[str], None],
    on_done: Callable[[], None],
    on_error: Callable[[Exception], None],
    on_reasoning: Optional[Callable[[], None]] = None,
) -> None:
    """
    Stream a chat completion from the AI API.
    Handles Doubao Seed model's reasoning_content phase before actual content.
    Calls on_reasoning() once when reasoning starts, on_chunk(text) for each content token,
    on_done() when complete, on_error(exc) on failure.
    """
    all_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    endpoint = _get_endpoint()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config.ai_api_key}",
        "Accept": "text/event-stream",
        "Accept-Encoding": "identity",
    }
    body = {
        "model": config.ai_model,
        "messages": all_messages,
        "stream": True,
        "max_tokens": 2000,
        "temperature": 0.7,
    }

    try:
        reasoning_notified = False
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", endpoint, json=body, headers=headers) as resp:
                if resp.status_code != 200:
                    text = await resp.aread()
                    raise Exception(f"AI API error {resp.status_code}: {text.decode()}")

                buffer = ""
                async for raw_chunk in resp.aiter_raw():
                    buffer += raw_chunk.decode("utf-8", errors="replace")
                    lines = buffer.split("\n")
                    buffer = lines[-1]  # keep incomplete last line

                    for line in lines[:-1]:
                        line = line.strip()
                        if not line or not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            on_done()
                            return
                        try:
                            parsed = json.loads(data)
                            delta = parsed.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content")
                            reasoning = delta.get("reasoning_content")
                            if content:
                                on_chunk(content)
                            if reasoning and on_reasoning and not reasoning_notified:
                                reasoning_notified = True
                                on_reasoning()
                        except json.JSONDecodeError:
                            pass

        on_done()

    except Exception as e:
        on_error(e)


async def stream_chat_sse(
    messages: list[dict],
    context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Yields raw SSE strings for use with FastAPI StreamingResponse.
    Handles reasoning phase (sends {"thinking": true} event once).

    Args:
        messages: Conversation history (user / assistant turns).
        context:  Optional RAG context block to append to the system prompt.
                  When provided, the AI uses the retrieved KB passages to
                  ground its answer.
    """
    # Build system prompt: base + optional RAG context
    system_content = (
        f"{SYSTEM_PROMPT}\n\n{context}" if context else SYSTEM_PROMPT
    )

    endpoint = _get_endpoint()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config.ai_api_key}",
        "Accept": "text/event-stream",
        "Accept-Encoding": "identity",
    }
    body = {
        "model": config.ai_model,
        "messages": [{"role": "system", "content": system_content}] + messages,
        "stream": True,
        "max_tokens": 2000,
        "temperature": 0.7,
    }

    reasoning_notified = False

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", endpoint, json=body, headers=headers) as resp:
                if resp.status_code != 200:
                    err_body = await resp.aread()
                    yield f'data: {json.dumps({"error": f"AI error {resp.status_code}"})}\n\n'
                    return

                buffer = ""
                async for raw_chunk in resp.aiter_raw():
                    buffer += raw_chunk.decode("utf-8", errors="replace")
                    lines = buffer.split("\n")
                    buffer = lines[-1]

                    for line in lines[:-1]:
                        line = line.strip()
                        if not line or not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            yield f'data: {json.dumps({"done": True})}\n\n'
                            return
                        try:
                            parsed = json.loads(data)
                            delta = parsed.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content")
                            reasoning = delta.get("reasoning_content")
                            if reasoning and not reasoning_notified:
                                reasoning_notified = True
                                yield f'data: {json.dumps({"thinking": True})}\n\n'
                            if content:
                                yield f'data: {json.dumps({"text": content})}\n\n'
                        except json.JSONDecodeError:
                            pass

    except Exception as e:
        yield f'data: {json.dumps({"error": str(e)})}\n\n'
