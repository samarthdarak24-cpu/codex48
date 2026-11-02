# PRECEDENT — Model Cards & Licenses

---

## 1. RapidOCR (ONNX Runtime CPU)
- **Model Architecture:** Lightweight DBNet (text detection) + MobileNet/SVTR (text recognition).
- **Execution Target:** ONNX Runtime on CPU.
- **License:** Apache 2.0.
- **Purpose:** Local text extraction from uploaded creative assets without cloud transmission.

---

## 2. BGE-M3 (BAAI General Embedding)
- **Model Architecture:** Multilingual dense and lexical embedding model (1024 dimensions).
- **License:** MIT.
- **Purpose:** Passage representation for semantic retrieval over brand guidelines.
- **Inference Mode:** Run via ONNX / HTTP embedding provider, or fallback to lexical BM25 ranking when unconfigured.

---

## 3. Large Language Model (Optional Advisory Seam)
- **Supported Providers:** Any OpenAI-compatible `/v1/chat/completions` API (e.g. OpenAI GPT-4o-mini, Anthropic via gateway, local Ollama/vLLM).
- **Role:** Non-binding advisory suggestions and minimal edits only.
- **Safety Boundaries:** Protected by untrusted delimiters and strict citation verification. No decision-making authority.

