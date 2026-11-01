# PRECEDENT — Declared System Limitations

In accordance with our strict non-fabrication principles, the following limitations are declared honestly:

1. **Hardware / GPU Independence:** The base application executes on standard CPU architectures without GPU acceleration. RapidOCR and computer vision color clustering execute on CPU. High-throughput video frame-by-frame visual governance is scheduled for future roadmaps.
2. **Deterministic Primacy:** Deterministic rules are the sole official outcome source (`violation`, `compliant`, `unknown`). The AI advisory layer assists with drafting and evidence retrieval; it cannot overrule code-level deterministic checks.
3. **Lexical & Hybrid Retrieval Mode:** When `USE_PGVECTOR` is false (default local SQLite mode), embedding vectors are evaluated in-process via cosine similarity alongside reciprocal rank fusion (RRF) over full-text indices.
4. **LLM Dependency & Graceful Degradation:** When `LLM_API_KEY` is not provided, AI advisory endpoints gracefully degrade to `completed_without_ai`. Heuristic sentence mining and deterministic rule checks continue to operate at 100% functionality.
5. **Malware Scanning Hook:** ClamAV malware scanning is configured via `MALWARE_SCAN=off|clamav`. In local development environments without an active ClamAV daemon, binary malware scanning is flagged `off`.

