"""
RAG (Retrieval-Augmented Generation) context manager.

At startup it loads all .txt knowledge-base files, splits them into
paragraph-level chunks, and builds an in-memory TF-IDF index.

At inference time `rag_service.build_context(query)` returns a formatted
context string that is prepended to the AI system prompt, or None when
the query has no relevant match in the KB.

No external ML dependencies — only jieba for Chinese word segmentation.
"""
from __future__ import annotations

import math
import logging
from pathlib import Path
from typing import Optional

# Suppress jieba's verbose startup messages before importing it
logging.getLogger("jieba").setLevel(logging.WARNING)
import jieba  # noqa: E402

logger = logging.getLogger(__name__)

# ─── paths & knobs ────────────────────────────────────────────────────────────

KB_DIR = (
    Path(__file__).parent.parent
    / "data"
    / "llm_ref"
    / "home-edu-etl-llm_combine-prompt"
)

# Chunk sizing
MAX_PARA_CHARS = 600   # split paragraphs longer than this on sentence boundaries
MIN_PARA_CHARS = 40    # skip very short fragments

# Retrieval
DEFAULT_TOP_K = 3      # chunks to retrieve per query
MIN_SCORE = 0.02       # cosine threshold — below this → treat as irrelevant
MAX_CONTEXT_CHARS = 1600  # hard cap to avoid oversized prompts

# ─── stop-words ───────────────────────────────────────────────────────────────

_STOP: frozenset[str] = frozenset({
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "都",
    "一", "上", "也", "而", "大", "到", "以", "我们", "这", "要",
    "里", "地", "得", "与", "或者", "但是", "如果", "因为", "所以",
    "然后", "虽然", "即使", "不过", "除了", "关于", "对于", "根据",
    "通过", "这样", "那样", "一些", "这些", "那些", "一个", "有些",
    "很", "非常", "比较", "什么", "谁", "怎么", "哪里", "还", "没",
    "只", "其中", "之中", "之间", "之前", "之后", "每个", "所有",
    "全部", "许多", "各种", "任何", "可以", "已经", "还是", "并且",
    "这个", "那个", "这种", "那种", "这里", "那里", "现在", "当时",
    "以前", "以后", "将来", "一直", "一定", "每次", "同时", "其实",
    "，", "。", "！", "？", "：", "；", "\u201c", "\u201d",
    "\u2018", "\u2019", "（", "）", "【", "】", "——", "…",
    "、", "\n", "\t", " ", "\u3000",
})


# ─── helpers ──────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    """Segment Chinese text with jieba, drop stop-words and single characters."""
    return [
        w for w in jieba.lcut(text, cut_all=False)
        if len(w) >= 2 and w not in _STOP
    ]


def _split_long_paragraph(para: str) -> list[str]:
    """
    Split a paragraph that exceeds MAX_PARA_CHARS on sentence boundaries
    (。！？\n).  Returns the original paragraph as a single-item list
    when it is already short enough.
    """
    if len(para) <= MAX_PARA_CHARS:
        return [para]

    chunks: list[str] = []
    buf = ""
    half = MAX_PARA_CHARS // 2

    for ch in para:
        buf += ch
        if ch in "。！？\n" and len(buf) >= half:
            s = buf.strip()
            if s:
                chunks.append(s)
            buf = ""

    if buf.strip():
        chunks.append(buf.strip())

    return chunks if chunks else [para]


def _cosine(v1: dict[str, float], v2: dict[str, float]) -> float:
    common = set(v1) & set(v2)
    if not common:
        return 0.0
    dot = sum(v1[k] * v2[k] for k in common)
    mag = (
        math.sqrt(sum(x * x for x in v1.values()))
        * math.sqrt(sum(x * x for x in v2.values()))
    )
    return dot / mag if mag else 0.0


# ─── service class ────────────────────────────────────────────────────────────

class _RAGService:
    """Singleton that holds the in-memory TF-IDF index."""

    def __init__(self) -> None:
        self._chunks: list[dict] = []                   # {text, source}
        self._tfidf: list[dict[str, float]] = []        # per-chunk TF-IDF vector
        self._idf: dict[str, float] = {}
        self._ready = False

    # ── index construction ────────────────────────────────────────────────

    def load(self) -> None:
        """
        Load all KB .txt files, chunk them, and build the TF-IDF index.
        Idempotent — safe to call multiple times (second call is a no-op).
        Blocking — run it once at startup or inside run_in_executor.
        """
        if self._ready:
            return

        if not KB_DIR.exists():
            logger.warning("RAG: KB directory not found: %s", KB_DIR)
            self._ready = True
            return

        files = sorted(KB_DIR.glob("*.txt"))
        logger.info("RAG: loading %d knowledge-base files…", len(files))

        for path in files:
            try:
                raw = path.read_text(encoding="utf-8", errors="ignore")
            except Exception as exc:
                logger.warning("RAG: cannot read %s — %s", path.name, exc)
                continue

            source = path.stem
            # Split on blank lines → paragraphs, then split long ones further
            for raw_para in raw.split("\n\n"):
                para = raw_para.strip()
                if not para:
                    continue
                for chunk in _split_long_paragraph(para):
                    if len(chunk) >= MIN_PARA_CHARS:
                        self._chunks.append({"text": chunk, "source": source})

        n = len(self._chunks)
        if n == 0:
            logger.warning("RAG: no chunks produced — KB may be empty")
            self._ready = True
            return

        logger.info("RAG: tokenising %d chunks…", n)
        all_tokens = [_tokenize(c["text"]) for c in self._chunks]

        # ── IDF ──
        df: dict[str, int] = {}
        for tokens in all_tokens:
            for t in set(tokens):
                df[t] = df.get(t, 0) + 1
        self._idf = {
            t: math.log((n + 1) / (cnt + 1)) + 1.0
            for t, cnt in df.items()
        }

        # ── TF-IDF vectors ──
        self._tfidf = [self._make_vec(toks) for toks in all_tokens]

        self._ready = True
        logger.info(
            "RAG: index ready — %d chunks, %d vocab terms",
            n, len(self._idf),
        )

    def _make_vec(self, tokens: list[str]) -> dict[str, float]:
        if not tokens:
            return {}
        tf: dict[str, int] = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        total = len(tokens)
        return {
            t: (cnt / total) * self._idf.get(t, 1.0)
            for t, cnt in tf.items()
        }

    # ── retrieval ─────────────────────────────────────────────────────────

    def retrieve(self, query: str, top_k: int = DEFAULT_TOP_K) -> list[dict]:
        """
        Return up to *top_k* chunks most relevant to *query*.
        Each result dict has keys: text, source, score.
        Returns [] when the KB is empty or the query has no match.
        """
        if not self._ready:
            self.load()
        if not self._chunks:
            return []

        q_vec = self._make_vec(_tokenize(query))
        if not q_vec:
            return []

        scored = sorted(
            ((i, _cosine(q_vec, tv)) for i, tv in enumerate(self._tfidf)),
            key=lambda x: x[1],
            reverse=True,
        )

        results: list[dict] = []
        seen_sources: set[str] = set()

        for idx, score in scored:
            if score < MIN_SCORE:
                break
            src = self._chunks[idx]["source"]
            # One passage per source file keeps the context diverse
            if src in seen_sources:
                continue
            seen_sources.add(src)
            results.append({**self._chunks[idx], "score": round(score, 4)})
            if len(results) >= top_k:
                break

        if logger.isEnabledFor(logging.DEBUG):
            logger.debug("RAG query: %r  →  %d hit(s)", query, len(results))
            for i, r in enumerate(results, 1):
                preview = r["text"][:120].replace("\n", " ")
                logger.debug(
                    "  [%d] score=%.4f  source=%s  text=%r…",
                    i, r["score"], r["source"], preview,
                )

        return results

    # ── context formatting ────────────────────────────────────────────────

    def build_context(self, query: str) -> Optional[str]:
        """
        Retrieve relevant passages and format them as a context block
        ready to be appended to the AI system prompt.

        Returns None when no relevant content is found (e.g. off-topic query)
        so the caller can skip injection entirely.
        """
        passages = self.retrieve(query)
        if not passages:
            return None

        parts: list[str] = []
        total_chars = 0

        for p in passages:
            remaining = MAX_CONTEXT_CHARS - total_chars
            if remaining <= 0:
                break
            text = p["text"]
            if len(text) > remaining:
                text = text[:remaining].rsplit("。", 1)[0] + "。"
            parts.append(text)
            total_chars += len(text)

        if not parts:
            return None

        body = "\n\n".join(parts)
        return (
            "【参考知识库】\n"
            "以下内容摘自家庭教育课程资料，请结合这些内容为用户提供更专业的回答"
            "（不需要逐字引用，自然融入回答即可）：\n\n"
            f"{body}\n"
            "【知识库结束】"
        )


# ─── public singleton ─────────────────────────────────────────────────────────

rag_service = _RAGService()
