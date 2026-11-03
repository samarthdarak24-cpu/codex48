"""A2 Evidence Intelligence tests: retrieval, citation validation, trust panel.

The invariant these tests protect is that the advisory layer can never invent
evidence: retrieval is workspace-scoped, every citation is machine-checked
against stored passages, and a dead LLM degrades to an empty result plus one
honest log row instead of an exception.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app import models
from app.config import settings
from app.db import SessionLocal
from app.ids import new_id
from app.services import evidence as ev


PASSAGE_TEXT = (
    "Copy must not state or imply that a product boosts immunity or prevents illness."
)
COLOUR_TEXT = "Approved background colours are lime green and warm cream."
DISCOUNT_TEXT = "Every percentage discount must carry a dated campaign window."


@pytest.fixture
def db():
    """A session against the per-test database built by conftest."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def seeded(db):
    """Two workspaces of guideline passages plus one active rule.

    The WellnessLife passage repeats the PureGlow text verbatim so that a
    workspace leak would be impossible to miss in the retrieval tests.
    """
    db.add_all(
        [
            models.GuidelineDoc(id="doc_pg", workspace="PureGlow", name="Claims Guide"),
            models.GuidelineDoc(id="doc_wl", workspace="WellnessLife", name="WL Claims Guide"),
        ]
    )
    db.add_all(
        [
            models.GuidelinePassage(
                id="p_health",
                doc_id="doc_pg",
                workspace="PureGlow",
                heading="Health claims",
                passage_text=PASSAGE_TEXT,
            ),
            models.GuidelinePassage(
                id="p_colour",
                doc_id="doc_pg",
                workspace="PureGlow",
                heading="Colour",
                passage_text=COLOUR_TEXT,
            ),
            models.GuidelinePassage(
                id="p_discount",
                doc_id="doc_pg",
                workspace="PureGlow",
                heading="Discounts",
                passage_text=DISCOUNT_TEXT,
            ),
            models.GuidelinePassage(
                id="p_wl_health",
                doc_id="doc_wl",
                workspace="WellnessLife",
                heading="Health claims",
                passage_text=PASSAGE_TEXT,
            ),
            models.Rule(
                id="rule_cl06",
                workspace="PureGlow",
                code="CL-06",
                title="No health claims",
                summary="Copy may not claim immunity or treatment benefits.",
                status="active",
                source_doc_id="doc_pg",
                source_passage=PASSAGE_TEXT,
            ),
        ]
    )
    db.commit()
    return db


def _retrieved(passage_ids):
    """Minimal `retrieved` list shape, as produced by hybrid_retrieve."""
    return [{"passageId": pid} for pid in passage_ids]


# ---------------------------------------------------------------------------
# split_sentences / tokenize
# ---------------------------------------------------------------------------


def test_split_sentences_plain_text():
    """Latin copy splits on its terminators and keeps the punctuation."""
    assert ev.split_sentences("Glow up. Feel good! Is it?") == [
        "Glow up.",
        "Feel good!",
        "Is it?",
    ]
    assert ev.split_sentences("") == []
    assert ev.split_sentences(None) == []


def test_split_sentences_keeps_emoji_intact():
    """Emoji are not word characters, so they must survive rather than vanish.

    Copy with emoji is normal on social; dropping the sentence would silently
    exempt it from semantic review.
    """
    sentences = ev.split_sentences("Glow up ✨. Feel good 😊!")

    assert sentences == ["Glow up ✨.", "Feel good 😊!"]


def test_split_sentences_handles_devanagari_danda():
    """Devanagari uses the danda (।) as a full stop; two dandas = two sentences."""
    text = "त्वचा को चमकाएं। यह प्राकृतिक है।"
    sentences = ev.split_sentences(text)

    assert len(sentences) == 2
    assert all(s.strip() for s in sentences)
    assert sentences[0].endswith("।")


def test_split_sentences_never_returns_empty_for_non_empty_input():
    """Any real copy yields at least one reviewable sentence."""
    for text in [
        "a.",
        "नमस्ते",
        "one long line with no terminator",
        "✨ Glow ✨",
        "😀 ok 😀",
    ]:
        assert ev.split_sentences(text), text


def test_split_sentences_drops_single_character_fragments():
    """A lone glyph is not a sentence, so it is dropped by design (not a crash).

    The 2-character floor stops "!" or a single emoji becoming a "sentence"
    that retrieval could then be asked to explain.
    """
    assert ev.split_sentences("😀") == []
    assert ev.split_sentences("x") == []
    assert ev.split_sentences("xy") == ["xy"]


def test_tokenize_ignores_emoji_and_keeps_other_scripts():
    """BM25 tokens are letters/digits only; emoji are dropped, not fatal."""
    assert ev.tokenize("Glow up ✨") == ["glow", "up"]
    assert ev.tokenize("😀😀") == []
    assert ev.tokenize("") == []

    devanagari = ev.tokenize("त्वचा को चमकाएं")
    assert devanagari, "Devanagari must tokenise or retrieval can never match it"
    assert all(token == token.lower() for token in devanagari)


# ---------------------------------------------------------------------------
# hybrid_retrieve
# ---------------------------------------------------------------------------


def test_hybrid_retrieve_ranks_the_relevant_passage_first(seeded):
    """A paraphrase must still find its passage, and rank it above the rest.

    Retrieval is the only thing standing between the model and a random
    passage, so "returns something" is not good enough - it has to be the
    right something.
    """
    health = ev.hybrid_retrieve(seeded, "our serum boosts immunity and prevents illness", "PureGlow")
    discount = ev.hybrid_retrieve(seeded, "is there a dated campaign window for the discount", "PureGlow")

    assert health, "expected at least one retrieved passage"
    assert health[0]["passageId"] == "p_health"
    assert health[0]["rank"] == 1
    assert health[0]["bm25Score"] > 0.0
    # No embedding model is configured, so the result must say so.
    assert health[0]["method"] == "bm25"
    assert health[0]["vectorScore"] == 0.0

    assert discount, "expected at least one retrieved passage"
    assert discount[0]["passageId"] == "p_discount"


def test_hybrid_retrieve_is_workspace_scoped(seeded):
    """Another workspace's passage is invisible even when it matches exactly.

    The WellnessLife passage has identical text, so a leak would put it at
    rank 1 - and the reviewer would be shown another brand's guideline.
    """
    results = ev.hybrid_retrieve(seeded, PASSAGE_TEXT, "PureGlow")
    ids = [r["passageId"] for r in results]

    assert "p_health" in ids
    assert "p_wl_health" not in ids
    # And nothing returned may belong to another workspace at all.
    for passage_id in ids:
        row = seeded.get(models.GuidelinePassage, passage_id)
        assert row.workspace in (None, "PureGlow"), row.workspace


def test_hybrid_retrieve_without_matching_text_returns_nothing(seeded):
    """No lexical overlap means no results - not a list of arbitrary passages."""
    assert ev.hybrid_retrieve(seeded, "zzz qqq xyzzy", "PureGlow") == []
    assert ev.hybrid_retrieve(seeded, "!!!", "PureGlow") == []


def test_hybrid_retrieve_attaches_the_rule_that_quotes_the_passage(seeded):
    """A retrieved passage carries the rule code whose source quotes it.

    The prompt tells the model to cite `ruleCode`; if the mapping were empty
    every citation would be rejected as an unknown rule.
    """
    results = ev.hybrid_retrieve(seeded, "boosts immunity", "PureGlow")

    assert results[0]["passageId"] == "p_health"
    assert results[0]["ruleCode"] == "CL-06"


# ---------------------------------------------------------------------------
# validate_citation
# ---------------------------------------------------------------------------


def test_validate_citation_rejects_an_unknown_rule_code(seeded):
    """A rule code the database has never seen is rejected, never trusted."""
    ok, reason = ev.validate_citation(
        seeded,
        rule_code="NOPE-99",
        passage_id="p_health",
        quote=PASSAGE_TEXT,
        retrieved=_retrieved(["p_health"]),
        workspace="PureGlow",
    )

    assert ok is False
    assert reason == "unknown_rule_code"


def test_validate_citation_rejects_an_inactive_rule(seeded):
    """A retired rule cannot be cited as the basis of a live conflict."""
    seeded.add(
        models.Rule(
            id="rule_old",
            workspace="PureGlow",
            code="CL-OLD",
            title="Retired claim rule",
            status="archived",
            source_doc_id="doc_pg",
            source_passage=PASSAGE_TEXT,
        )
    )
    seeded.commit()

    ok, reason = ev.validate_citation(
        seeded,
        rule_code="CL-OLD",
        passage_id="p_health",
        quote=PASSAGE_TEXT,
        retrieved=_retrieved(["p_health"]),
        workspace="PureGlow",
    )

    assert ok is False
    assert reason == "inactive_rule_code"


def test_validate_citation_rejects_a_passage_that_was_not_retrieved(seeded):
    """The model may only cite what retrieval actually gave it.

    Without this check a model could name any passage id it remembers and the
    "evidence" would look grounded while being unverifiable.
    """
    ok, reason = ev.validate_citation(
        seeded,
        rule_code="CL-06",
        passage_id="p_colour",
        quote=COLOUR_TEXT,
        retrieved=_retrieved(["p_health"]),
        workspace="PureGlow",
    )

    assert ok is False
    assert reason == "passage_not_retrieved"


def test_validate_citation_rejects_a_quote_that_is_not_in_the_passage(seeded):
    """A quote absent from the stored passage is rejected as fabricated."""
    ok, reason = ev.validate_citation(
        seeded,
        rule_code="CL-06",
        passage_id="p_health",
        quote="Copy must guarantee immunity for life",
        retrieved=_retrieved(["p_health"]),
        workspace="PureGlow",
    )

    assert ok is False
    assert reason == "quote_not_in_passage"


def test_validate_citation_accepts_a_quote_after_whitespace_and_case_normalisation(seeded):
    """Re-wrapped and re-cased quotes are forgiven; the words must still match.

    OCR and copy-paste reflow quotes constantly, so a byte-exact comparison
    would reject honest citations while catching nothing extra.
    """
    ok, reason = ev.validate_citation(
        seeded,
        rule_code="CL-06",
        passage_id="p_health",
        quote="  COPY   must not state or imply\n that a product boosts immunity ",
        retrieved=_retrieved(["p_health"]),
        workspace="PureGlow",
    )

    assert ok is True
    assert reason is None


def test_validate_citation_never_accepts_a_fabricated_quote(seeded):
    """Plausible-sounding but invented quotes must all be rejected.

    This is the core anti-hallucination guard: the wording, not the topic,
    has to exist in the stored passage.
    """
    fabricated = [
        "Copy must not state that a product cures illness.",  # wrong wording
        "Products must always boost immunity.",  # opposite meaning
        "The guideline requires immunity claims to be substantiated by a lab.",
        "Approved background colours are lime green and teal.",  # one word changed
    ]

    for quote in fabricated:
        ok, reason = ev.validate_citation(
            seeded,
            rule_code="CL-06",
            passage_id="p_health",
            quote=quote,
            retrieved=_retrieved(["p_health"]),
            workspace="PureGlow",
        )
        assert ok is False, quote
        assert reason == "quote_not_in_passage", quote


def test_validate_citation_rejects_a_passage_from_another_workspace(seeded):
    """Even a real passage is unusable when it belongs to another workspace."""
    ok, reason = ev.validate_citation(
        seeded,
        rule_code="CL-06",
        passage_id="p_wl_health",
        quote=PASSAGE_TEXT,
        retrieved=_retrieved(["p_wl_health"]),
        workspace="PureGlow",
    )

    assert ok is False
    assert reason == "passage_not_in_workspace"


def test_validate_citation_rejects_a_too_short_quote(seeded):
    """A two-word "quote" cannot be evidence, so it is rejected outright."""
    ok, reason = ev.validate_citation(
        seeded,
        rule_code="CL-06",
        passage_id="p_health",
        quote="Copy",
        retrieved=_retrieved(["p_health"]),
        workspace="PureGlow",
    )

    assert ok is False
    assert reason == "quote_too_short"


# ---------------------------------------------------------------------------
# semantic_review — honest degradation
# ---------------------------------------------------------------------------


def test_semantic_review_without_llm_returns_empty_and_logs_skipped(db, monkeypatch):
    """No LLM configured: return [], never raise, log exactly one skipped call.

    The review request path must survive a missing provider, and the trust
    panel must still be able to say "we never asked" rather than showing a
    fake success.
    """
    monkeypatch.setattr(settings, "llm_api_key", "")
    monkeypatch.setattr(settings, "llm_base_url", "")

    def _no_network(*args, **kwargs):  # pragma: no cover - only runs on a bug
        raise AssertionError("semantic_review must not call the network when no LLM is configured")

    monkeypatch.setattr(ev.httpx, "post", _no_network)

    out = ev.semantic_review(
        db,
        submission_id="sub_test",
        version_id=None,
        text="Our serum boosts immunity. Glow up.",
        workspace="PureGlow",
    )

    assert out == []

    logs = db.query(models.AiCallLog).all()
    assert len(logs) == 1
    assert logs[0].status == "skipped"
    assert logs[0].error == "llm_not_configured"
    assert logs[0].purpose == ev.PURPOSE_REVIEW
    assert logs[0].workspace == "PureGlow"
    assert logs[0].prompt_version == ev.PROMPT_VERSION


def test_semantic_review_with_empty_text_does_not_log_a_call(db):
    """Empty copy is nothing to review: no call is attempted, so none is logged."""
    out = ev.semantic_review(
        db, submission_id="sub_test", version_id=None, text="", workspace="PureGlow"
    )

    assert out == []
    assert db.query(models.AiCallLog).count() == 0


# ---------------------------------------------------------------------------
# ai_trust_summary
# ---------------------------------------------------------------------------


def _call(db, **kwargs):
    defaults = dict(
        id=new_id("ail"),
        workspace="PureGlow",
        purpose=ev.PURPOSE_REVIEW,
        model="gpt-4o-mini",
        prompt_version=ev.PROMPT_VERSION,
        latency_ms=0,
        tokens_in=0,
        tokens_out=0,
        status="success",
        citations_verified=0,
        citations_rejected=0,
        redaction_count=0,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(kwargs)
    row = models.AiCallLog(**defaults)
    db.add(row)
    return row


def test_ai_trust_summary_counts_the_stored_call_log(db, monkeypatch):
    """Every trust-panel number is derived from the rows, not hardcoded.

    If the panel could not be reproduced from the log it would be decoration,
    and reviewers would have no way to audit what the AI layer actually did.
    """
    monkeypatch.setattr(settings, "embedding_model_path", "")
    monkeypatch.setattr(settings, "embedding_model", "")
    # The bundled ONNX encoder is a real model, so "no model configured" now
    # has to switch it off explicitly. This keeps the test's original intent:
    # with no embedding model at all, retrieval must be BM25-only and say so.
    monkeypatch.setattr(settings, "embedding_onnx_path", "/nonexistent/model.onnx")
    monkeypatch.setattr(settings, "embedding_tokenizer_path", "/nonexistent/tokenizer.json")

    _call(db, status="success", latency_ms=120, tokens_in=100, tokens_out=20,
          citations_verified=2, redaction_count=1)
    _call(db, status="success", latency_ms=380, tokens_in=50, tokens_out=10,
          citations_verified=3)
    _call(db, status="timeout", latency_ms=20000)
    _call(db, status="error", latency_ms=30, citations_rejected=1, redaction_count=1)
    _call(db, status="skipped", error="llm_not_configured")
    # Another workspace's calls must not be counted.
    _call(db, workspace="WellnessLife", status="success", latency_ms=999, tokens_in=1000)
    db.commit()

    summary = ev.ai_trust_summary(db, "PureGlow")

    assert summary["totalCalls"] == 5
    assert summary["byPurpose"] == {ev.PURPOSE_REVIEW: 5}
    assert summary["byStatus"] == {"success": 2, "timeout": 1, "error": 1, "skipped": 1}
    assert summary["successRate"] == pytest.approx(0.4)
    assert summary["timeoutRate"] == pytest.approx(0.2)
    assert summary["errorRate"] == pytest.approx(0.2)
    assert summary["skippedRate"] == pytest.approx(0.2)
    assert summary["citationsVerified"] == 5
    assert summary["citationsRejected"] == 1
    assert summary["citationRejectionRate"] == pytest.approx(1 / 6, abs=1e-4)
    # Only successful calls with a non-zero latency feed the average.
    assert summary["avgLatencyMs"] == pytest.approx(250.0)
    assert summary["tokensIn"] == 150
    assert summary["tokensOut"] == 30
    assert summary["redactionCount"] == 2
    assert summary["retrievalMethod"] == "bm25"
    assert summary["embeddingModel"] is None
    assert summary["promptVersion"] == ev.PROMPT_VERSION
    assert summary["lastCallAt"] is not None


def test_ai_trust_summary_is_honest_when_there_is_no_evidence(db):
    """With no calls, every count is zero and every rate is 0.0 - not 100%."""
    summary = ev.ai_trust_summary(db, "PureGlow")

    assert summary["totalCalls"] == 0
    assert summary["successRate"] == 0.0
    assert summary["citationRejectionRate"] == 0.0
    assert summary["avgLatencyMs"] == 0.0
    assert summary["lastCallAt"] is None
    assert summary["byStatus"] == {"success": 0, "timeout": 0, "error": 0, "skipped": 0}


def test_ai_trust_summary_ignores_calls_outside_the_window(db):
    """A 30-day window excludes older rows instead of counting them forever."""
    _call(db, created_at=datetime.now(timezone.utc) - timedelta(days=90))
    _call(db)
    db.commit()

    assert ev.ai_trust_summary(db, "PureGlow", days=30)["totalCalls"] == 1
    assert ev.ai_trust_summary(db, "PureGlow", days=365)["totalCalls"] == 2


# ---------------------------------------------------------------------------
# to_dict
# ---------------------------------------------------------------------------


def test_to_dict_exposes_the_camel_case_contract(db):
    """The serializer must emit the camelCase keys the frontend reads.

    A snake_case leak would render as blank fields in the trust panel while
    the API still returned 200.
    """
    finding = models.AiFinding(
        id="aif_1",
        workspace="PureGlow",
        submission_id="sub_1",
        submission_version_id="cv_1",
        rule_code="CL-06",
        rule_title="No health claims",
        passage_id="p_health",
        source_type="ai_suggestion",
        confidence=0.82,
        similarity=0.61,
        rationale="Implies an immunity benefit.",
        minimal_edit={"original": "boosts immunity", "proposed": "supports skin", "rationale": "r"},
        quote=PASSAGE_TEXT,
        citation_verified=True,
        rejected_reason=None,
        model="gpt-4o-mini",
        prompt_version=ev.PROMPT_VERSION,
    )
    db.add(finding)
    db.commit()

    payload = ev.to_dict(finding)

    expected = {
        "id",
        "submissionId",
        "versionId",
        "ruleCode",
        "ruleTitle",
        "passageId",
        "sourceType",
        "confidence",
        "similarity",
        "rationale",
        "minimalEdit",
        "quote",
        "citationVerified",
        "rejectedReason",
        "model",
        "promptVersion",
        "createdAt",
    }
    assert expected <= set(payload)
    assert not [k for k in payload if "_" in k], "snake_case keys must not reach the frontend"
    assert payload["submissionId"] == "sub_1"
    assert payload["versionId"] == "cv_1"
    assert payload["citationVerified"] is True
    assert payload["createdAt"] is not None
