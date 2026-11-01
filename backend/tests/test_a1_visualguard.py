"""A1 VisualGuard tests: contrast, colour, layout, logo matching, pipeline, rules.

Every image is generated here with Pillow into `tmp_path`; nothing depends on
the demo assets on disk. The point of these tests is the *honesty* of the
analysers: a measurement that could not be made must come back as "unknown",
never as a pass, and a corrupt upload must never raise into the request path.
"""
import os
import pytest
from PIL import Image, ImageDraw, ImageFont

from app.rule_engine import (
    APPROVED_BACKGROUNDS,
    evaluate_background,
    evaluate_contrast,
    evaluate_logo,
)
from app.services.submissions import _AssetObj
from app.services.visual import colors, contrast, layout, ocr, pipeline


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _poster(path, size, background, blocks=()):
    """Write a flat poster with solid rectangles. Returns the path as a str."""
    img = Image.new("RGB", size, background)
    draw = ImageDraw.Draw(img)
    for (x, y, w, h), fill in blocks:
        draw.rectangle([x, y, x + w - 1, y + h - 1], fill=fill)
    img.save(path)
    return str(path)


def _block(x, y, w, h, text="Hello there", confidence=0.95):
    return {
        "text": text,
        "box": {"x": x, "y": y, "w": w, "h": h},
        "confidence": confidence,
    }


def _facts(**kwargs):
    """The same asset namespace the pipeline hands to the rule engine."""
    return _AssetObj(**kwargs)


def _max_channel_delta(hex_a, hex_b):
    """Largest per-channel difference between two #RRGGBB strings (0..255)."""
    a = tuple(int(hex_a.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    b = tuple(int(hex_b.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    return max(abs(x - y) for x, y in zip(a, b))


@pytest.fixture
def tmp_image(tmp_path):
    """Path factory for posters written into this test's tmp_path."""
    counter = {"n": 0}

    def _make(size, background, blocks=(), name=None):
        counter["n"] += 1
        path = tmp_path / (name or f"poster_{counter['n']}.png")
        return _poster(path, size, background, blocks)

    return _make


# ---------------------------------------------------------------------------
# contrast.py
# ---------------------------------------------------------------------------


def test_contrast_black_on_white_passes(tmp_image):
    """21:1 is the maximum ratio; a pass here proves the WCAG maths is right.

    Without this the whole contrast rule could silently invert (fail good
    posters, pass bad ones) and nobody would notice.
    """
    # Height 18 keeps the block under the 24px "large text" threshold, so the
    # normal-text 4.5:1 bar applies.
    path = tmp_image((200, 100), (255, 255, 255), [((20, 20, 120, 18), (0, 0, 0))])
    findings = contrast.contrast_findings(path, [_block(20, 20, 120, 18)])

    assert len(findings) == 1
    finding = findings[0]
    assert finding["value"] == pytest.approx(21.0, abs=0.01)
    assert finding["threshold"] == 4.5
    assert finding["isLargeText"] is False
    assert finding["status"] == "pass"
    assert finding["foreground"] == "#000000"
    assert finding["background"] == "#FFFFFF"


def test_contrast_near_identical_greys_fail(tmp_image):
    """Two greys one step apart are unreadable and must be reported as a fail.

    This is the failure mode real posters have (white text on a pale photo);
    a checker that only ever returns "pass" would be worse than none.
    """
    path = tmp_image((200, 100), (128, 128, 128), [((20, 20, 120, 18), (138, 138, 138))])
    findings = contrast.contrast_findings(path, [_block(20, 20, 120, 18)])

    assert len(findings) == 1
    assert findings[0]["status"] == "fail"
    assert findings[0]["value"] < 4.5
    assert findings[0]["value"] < 1.5, "two near-identical greys cannot score above 1.5:1"


def test_contrast_sits_on_both_sides_of_the_threshold(tmp_image):
    """#767676 on white (4.54:1) passes and #777777 (4.48:1) fails.

    Pinning both sides of the boundary is what stops the threshold from
    drifting when someone "tidies" the constant.
    """
    passing = tmp_image((200, 100), (255, 255, 255), [((20, 20, 120, 18), (0x76, 0x76, 0x76))])
    failing = tmp_image((200, 100), (255, 255, 255), [((20, 20, 120, 18), (0x77, 0x77, 0x77))])

    above = contrast.contrast_findings(passing, [_block(20, 20, 120, 18)])[0]
    below = contrast.contrast_findings(failing, [_block(20, 20, 120, 18)])[0]

    assert above["value"] == pytest.approx(4.54, abs=0.01)
    assert above["status"] == "pass"
    assert below["value"] == pytest.approx(4.48, abs=0.01)
    assert below["status"] == "fail"


def test_contrast_without_text_blocks_is_unknown_not_a_pass(tmp_image):
    """No measurable region means no opinion: an empty list, never a pass.

    A blank result that were treated as "no failures" would let every
    un-analysed poster through as compliant.
    """
    path = tmp_image((200, 100), (255, 255, 255))
    assert contrast.contrast_findings(path, []) == []
    assert contrast.worst_contrast([]) is None


def test_contrast_on_an_unreadable_file_returns_empty(tmp_path):
    """A corrupt or missing file degrades to "nothing measured" instead of raising."""
    corrupt = tmp_path / "corrupt.png"
    corrupt.write_bytes(b"this is not an image")

    assert contrast.contrast_findings(str(corrupt), [_block(0, 0, 40, 20)]) == []
    assert contrast.contrast_findings(str(tmp_path / "missing.png"), [_block(0, 0, 40, 20)]) == []


# ---------------------------------------------------------------------------
# colors.py
# ---------------------------------------------------------------------------


def test_solid_fill_background_is_the_modal_border_colour(tmp_image):
    """A single-colour poster reports that colour as its background.

    The brand-colour rule (COLOR-001 / BR-01) reads this value, so a wrong
    background turns into a wrong verdict on the poster.
    """
    # Bucket-aligned colour: border sampling quantises to 16-level buckets.
    path = tmp_image((120, 120), (0x70, 0x80, 0x90))
    assert colors.background_color(path) == "#708090"

    dominant = colors.dominant_colors(path)
    assert dominant[0]["hex"] == "#708090"
    assert dominant[0]["ratio"] == pytest.approx(1.0)


def test_background_sampling_stays_within_one_quantisation_bucket(tmp_image):
    """The sampled background may be quantised but must not drift to another hue.

    #7AB93B is the approved lime; if border sampling returned something 40/255
    away the palette rule would fail a compliant poster.
    """
    path = tmp_image((120, 120), (0x7A, 0xB9, 0x3C))
    measured = colors.background_color(path)

    assert measured is not None
    # Border sampling floors each channel into a 16-level bucket, so the answer
    # may be up to 15 darker per channel but must stay in the same hue.
    assert _max_channel_delta(measured, "#7AB93B") <= 16


def test_colour_helpers_return_empty_for_unreadable_files(tmp_path):
    """Missing and corrupt files return None / [] so callers can say "unknown"."""
    corrupt = tmp_path / "not_an_image.png"
    corrupt.write_bytes(b"nope")

    assert colors.background_color(str(tmp_path / "missing.png")) is None
    assert colors.dominant_colors(str(tmp_path / "missing.png")) == []
    assert colors.background_color(str(corrupt)) is None
    assert colors.dominant_colors(str(corrupt)) == []


# ---------------------------------------------------------------------------
# layout.py
# ---------------------------------------------------------------------------


def test_layout_metrics_of_a_known_poster():
    """Known boxes give known geometry: aspect ratio, coverage and clear space.

    These numbers are what the UI draws and what LO-02 consumes, so they are
    checked against hand-computed values rather than "is not None".
    """
    metrics = layout.layout_metrics(
        width=800,
        height=1000,
        text_blocks=[_block(100, 50, 600, 100)],
        logo_matches=[{"box": {"x": 100, "y": 800, "w": 100, "h": 100}, "confidence": 0.9}],
    )

    assert metrics["aspectRatio"] == "4:5"
    assert metrics["aspectValue"] == pytest.approx(0.8)
    # 600*100 of 800*1000 = 7.5% covered text.
    assert metrics["textAreaRatio"] == pytest.approx(0.075)
    assert metrics["emptySpaceRatio"] == pytest.approx(0.925)
    # The logo sits 100px from every edge and 650px from the text block, so the
    # nearest gap is 100px = 1.0x the 100px logo height.
    assert metrics["clearSpaceRatio"] == pytest.approx(1.0)
    assert metrics["clearSpaceRatioWidth"] == pytest.approx(1.0)
    assert metrics["logoCount"] == 1
    assert metrics["textBlockCount"] == 1
    assert metrics["status"] == "measured"


def test_layout_margins_measure_the_gap_from_content_to_each_edge():
    """One box at (100, 50, 600x100) leaves 50 top, 100 left/right, 850 bottom."""
    metrics = layout.layout_metrics(
        width=800,
        height=1000,
        text_blocks=[_block(100, 50, 600, 100)],
        logo_matches=[],
    )

    # The box ends at y=150, so 850px of the 1000px canvas is empty below it.
    assert metrics["margins"] == {"top": 50, "right": 100, "bottom": 850, "left": 100}
    assert metrics["status"] == "no_logo"


def test_layout_right_and_bottom_margins_use_the_nearest_edge():
    """With two elements the right/bottom margins must come from the outermost one.

    A text block ending at x=700 and a logo ending at x=200 both sit in an
    800px canvas, so the right margin is 100px - not the 600px of empty space
    beside the logo. Same for the bottom edge.
    """
    metrics = layout.layout_metrics(
        width=800,
        height=1000,
        text_blocks=[_block(100, 50, 600, 100)],
        logo_matches=[{"box": {"x": 100, "y": 800, "w": 100, "h": 100}, "confidence": 0.9}],
    )

    assert metrics["margins"]["left"] == 100
    assert metrics["margins"]["top"] == 50
    assert metrics["margins"]["right"] == 100, "right-most element ends at x=700"
    assert metrics["margins"]["bottom"] == 100, "lowest element ends at y=900"


def test_layout_clear_space_uses_the_nearest_element():
    """A logo 30px from a text block is 0.6x its height - below the 1.5x minimum.

    Clear space is the one metric LO-02 turns into a violation, so it has to be
    the *nearest* gap, not an average or the canvas edge.
    """
    metrics = layout.layout_metrics(
        width=400,
        height=400,
        text_blocks=[_block(100, 180, 200, 30)],
        logo_matches=[{"box": {"x": 100, "y": 100, "w": 50, "h": 50}, "confidence": 0.9}],
    )

    assert metrics["clearSpaceRatio"] == pytest.approx(0.6)
    assert metrics["clearSpaceRatioWidth"] == pytest.approx(0.6)


def test_layout_without_text_boxes_reports_no_text():
    """No detected text is a status, not an empty success: "no_text".

    The pipeline maps this status to "Needs review"; silently reporting
    "measured" would hide that nothing was read.
    """
    metrics = layout.layout_metrics(width=400, height=500, text_blocks=[], logo_matches=[])

    assert metrics["status"] == "no_text"
    assert metrics["clearSpaceRatio"] is None
    assert metrics["textAreaRatio"] == 0.0
    assert metrics["emptySpaceRatio"] == 1.0
    assert metrics["margins"] == {"top": 0, "right": 0, "bottom": 0, "left": 0}


def test_aspect_ratio_is_reduced_and_never_raises():
    """Aspect ratios are reduced fractions, and a zero dimension returns ""."""
    assert layout.aspect_ratio(800, 1000) == "4:5"
    assert layout.aspect_ratio(1080, 1920) == "9:16"
    assert layout.aspect_ratio(0, 0) == ""


# ---------------------------------------------------------------------------
# logo_match.py
# ---------------------------------------------------------------------------


@pytest.fixture
def marks(tmp_path):
    """An approved-looking logo and an unrelated mark, both on disk."""
    pytest.importorskip("cv2", reason="logo matching needs OpenCV")

    def _mark(name, size, painter):
        path = tmp_path / name
        img = Image.new("RGB", (size, size), (255, 255, 255))
        painter(ImageDraw.Draw(img), size)
        img.save(path)
        return str(path)

    def _logo(draw, size):
        draw.ellipse([4, 4, size - 5, size - 5], fill=(20, 90, 40))
        draw.rectangle([size // 2 - 6, 12, size // 2 + 6, size - 12], fill=(255, 255, 255))
        draw.rectangle([12, size // 2 - 6, size - 12, size // 2 + 6], fill=(255, 255, 255))

    def _stripes(draw, size):
        for i in range(0, size, 6):
            draw.rectangle([i, 0, i + 2, size - 1], fill=(0, 0, 0))

    return {
        "logo": _mark("logo.png", 60, _logo),
        "stripes": _mark("stripes.png", 60, _stripes),
    }


def test_pasted_logo_is_matched_with_confidence_above_threshold(tmp_path, marks):
    """An exact paste must be found, with the box in original pixel coordinates.

    The frontend draws the highlight straight from this box, so an offset or a
    low confidence would point the reviewer at the wrong part of the poster.
    """
    from app.services.visual import logo_match

    poster = Image.new("RGB", (600, 400), (250, 250, 250))
    draw = ImageDraw.Draw(poster)
    draw.rectangle([20, 20, 120, 60], fill=(200, 200, 200))
    draw.rectangle([480, 340, 580, 380], fill=(180, 180, 180))
    with Image.open(marks["logo"]) as logo:
        poster.paste(logo, (200, 150))
    path = tmp_path / "poster.png"
    poster.save(path)

    matches = logo_match.match_logos(
        str(path), [{"id": "logo-1", "name": "PureGlow", "path": marks["logo"]}]
    )

    assert len(matches) == 1
    match = matches[0]
    assert match["logoId"] == "logo-1"
    assert match["confidence"] >= 0.62
    assert match["confident"] is True
    assert match["box"] == {"x": 200, "y": 150, "w": 60, "h": 60}
    assert match["method"] == "template_match_multiscale"


def test_unrelated_template_produces_no_confident_match(tmp_path, marks):
    """A mark that is not in the library must not be reported as confident.

    This is the difference between "Needs review" and a false accusation that
    the wrong logo was used.
    """
    from app.services.visual import logo_match

    poster = Image.new("RGB", (600, 400), (250, 250, 250))
    draw = ImageDraw.Draw(poster)
    draw.rectangle([20, 20, 120, 60], fill=(200, 200, 200))
    with Image.open(marks["logo"]) as logo:
        poster.paste(logo, (200, 150))
    path = tmp_path / "poster.png"
    poster.save(path)

    matches = logo_match.match_logos(
        str(path), [{"id": "logo-2", "name": "Other brand", "path": marks["stripes"]}]
    )

    assert all(m["confident"] is False for m in matches), matches
    assert all(m["confidence"] < 0.62 for m in matches), matches


# ---------------------------------------------------------------------------
# pipeline.run_pipeline
# ---------------------------------------------------------------------------


def _fake_ocr(blocks, error=None):
    """Deterministic stand-in for Tesseract.

    The pipeline is what is under test here; stubbing OCR keeps these cases
    offline and fast while still exercising layout, colour and contrast on the
    real pixels.
    """

    def _read(_path):
        return {
            "ok": not error,
            "text": "\n".join(b["text"] for b in blocks),
            "blocks": list(blocks),
            "meanConfidence": 0.9 if blocks else 0.0,
            "engine": {"name": "stub", "version": "0", "langs": ["eng"], "psm": 11},
            "error": error,
        }

    return _read


def test_pipeline_reports_a_corrupt_file_as_failed(tmp_path):
    """A bad upload becomes status="failed" with an error, never an exception.

    This runs in a background task; an exception here would leave the analysis
    row stuck in "processing" and the reviewer with no explanation.
    """
    bad = tmp_path / "broken.png"
    bad.write_bytes(b"definitely not a png")

    result = pipeline.run_pipeline(str(bad))

    assert result["status"] == "failed"
    assert result["error"]
    assert result["unreadable"] is True
    assert (result["width"], result["height"]) == (0, 0)


def test_pipeline_flags_a_blank_image_as_unreadable(tmp_image, monkeypatch):
    """A blank canvas is "nothing could be measured", not a clean bill of health.

    Without the flag, every rule that needs a measurement would be skipped and
    the poster would look compliant.
    """
    monkeypatch.setattr(pipeline.ocr_mod, "read_text", _fake_ocr([]))
    path = tmp_image((300, 300), (255, 255, 255))

    result = pipeline.run_pipeline(path)

    assert result["status"] == "complete"
    assert result["unreadable"] is True
    assert result["error"] == "image appears blank"
    assert result["text_blocks"] == []
    assert result["contrast_findings"] == []


def test_pipeline_completes_with_measured_facts(tmp_image, monkeypatch):
    """A readable poster comes back complete with size and every measured fact.

    This is the contract `analyze_asset` persists, so a silent failure here
    would leave the AssetAnalysis row empty while claiming success.
    """
    blocks = [_block(20, 20, 120, 30, text="Glow up")]
    monkeypatch.setattr(pipeline.ocr_mod, "read_text", _fake_ocr(blocks))
    path = tmp_image((400, 500), (0x7A, 0xB9, 0x3C), [((20, 20, 120, 30), (0, 0, 0))])

    result = pipeline.run_pipeline(path)

    assert result["status"] == "complete"
    assert result["error"] is None
    assert result["unreadable"] is False
    assert (result["width"], result["height"]) == (400, 500)
    assert result["ocr_text"] == "Glow up"
    assert result["layout_metrics"]["textBlockCount"] == 1
    assert result["layout_metrics"]["aspectRatio"] == "4:5"
    # Black on lime is comfortably above the 4.5:1 bar, and the worst measured
    # ratio is derived from the per-region findings, not copied from a config.
    assert len(result["contrast_findings"]) == 1
    assert result["contrast_findings"][0]["status"] == "pass"
    assert result["worst_contrast"] == result["contrast_findings"][0]["value"]
    assert result["worst_contrast"] >= 4.5
    # The border is lime, so the background estimate is the palette colour
    # within one quantisation bucket.
    assert _max_channel_delta(result["background_color"], "#7AB93B") <= 16


# ---------------------------------------------------------------------------
# ocr.py (guarded: needs the Tesseract binary)
# ---------------------------------------------------------------------------


def test_ocr_reports_an_unreadable_image_without_raising(tmp_path):
    """OCR failure is a recorded error, not an exception into the pipeline."""
    pytest.importorskip("pytesseract", reason="OCR requires pytesseract")
    ready, reason = ocr._tesseract_ready()
    if not ready:
        pytest.skip(f"Tesseract unavailable: {reason}")

    bad = tmp_path / "broken.png"
    bad.write_bytes(b"not an image either")

    result = ocr.read_text(str(bad))

    assert result["ok"] is False
    assert result["blocks"] == []
    assert result["error"] and "unreadable image" in result["error"]


# ---------------------------------------------------------------------------
# rule_engine: the three-way logo rule and the visual thresholds
# ---------------------------------------------------------------------------


def test_evaluate_logo_without_a_detection_is_unknown():
    """No detection is not evidence of a missing logo - it is "Needs review".

    Detection misses rotated or recoloured marks, so calling this a violation
    would accuse compliant posters.
    """
    assert evaluate_logo(_facts()).verdict == "unknown"
    assert evaluate_logo(_facts(logo_confidence=0.9, logo_confident=False, logo_count=0)).verdict == "unknown"
    assert evaluate_logo(None).verdict == "unknown"


def test_evaluate_logo_low_confidence_is_needs_review_not_a_violation():
    """0.5 correlation is below the 0.62 fact threshold but above 0.40: unknown.

    This is the whole point of the rule: a weak hit is a question for a human,
    never a fail.
    """
    ev = evaluate_logo(_facts(logo_confidence=0.5, logo_confident=False, logo_count=1))

    assert ev.verdict == "unknown"
    assert ev.verdict != "fail"
    assert "human" in ev.detail.lower()


def test_evaluate_logo_confident_match_passes_and_very_low_confidence_fails():
    """A confident hit passes; a detection that is clearly the wrong mark fails.

    0.1 is far below the 0.40 floor, so the mark on the poster is measurably
    not an approved logo - that is a violation, not a question.
    """
    passed = evaluate_logo(_facts(logo_confidence=0.93, logo_confident=True, logo_count=1))
    failed = evaluate_logo(_facts(logo_confidence=0.1, logo_confident=False, logo_count=1))

    assert passed.verdict == "pass"
    assert failed.verdict == "fail"


def test_evaluate_contrast_below_above_and_unmeasured():
    """Below the minimum fails, at/above passes, no measurement is unknown."""
    assert evaluate_contrast(_facts(contrast_ratio=3.2), 4.5).verdict == "fail"
    assert evaluate_contrast(_facts(contrast_ratio=4.5), 4.5).verdict == "pass"
    assert evaluate_contrast(_facts(contrast_ratio=9.1), 4.5).verdict == "pass"
    assert evaluate_contrast(_facts(), 4.5).verdict == "unknown"
    assert evaluate_contrast(_facts(contrast_ratio=1.0, unreadable=True), 4.5).verdict == "unknown"


def test_evaluate_background_tolerance_absorbs_jpeg_drift():
    """#7BB93C is #7AB93B after JPEG chroma shift: fail at 0, pass at 48.

    Without the tolerance every real photographed poster would fail the
    palette rule; with an unbounded tolerance the rule would be meaningless.
    """
    measured = _facts(background_colour="#7BB93C")

    exact = evaluate_background(measured, APPROVED_BACKGROUNDS, tolerance=0.0)
    tolerant = evaluate_background(measured, APPROVED_BACKGROUNDS, tolerance=48.0)

    assert exact.verdict == "fail"
    assert tolerant.verdict == "pass"

    # The default is exact matching, which is what manual facts rely on.
    assert evaluate_background(measured, APPROVED_BACKGROUNDS).verdict == "fail"
    # A colour genuinely outside the palette still fails even with tolerance.
    assert evaluate_background(_facts(background_colour="#FF0000"), APPROVED_BACKGROUNDS, 48.0).verdict == "fail"


def test_evaluate_background_never_guesses_from_an_unreadable_asset():
    """An unreadable asset or a missing colour is unknown, not a fail."""
    assert evaluate_background(_facts(unreadable=True), APPROVED_BACKGROUNDS).verdict == "unknown"
    assert evaluate_background(_facts(), APPROVED_BACKGROUNDS).verdict == "unknown"
    assert evaluate_background(None, APPROVED_BACKGROUNDS).verdict == "unknown"


# ---------------------------------------------------------------------------
# Multilingual (Hindi/Marathi) and RapidOCR Fallback Tests
# ---------------------------------------------------------------------------

def test_ocr_hindi_devanagari_traineddata_fixture(tmp_path):
    """Real fixture test using downloaded hin.traineddata."""
    img_path = str(tmp_path / "hindi_creative.png")
    img = Image.new("RGB", (800, 250), color="white")
    draw = ImageDraw.Draw(img)
    font_path = r"C:\Windows\Fonts\Nirmala.ttc"
    if os.path.exists(font_path):
        font = ImageFont.truetype(font_path, 44)
    else:
        font = ImageFont.load_default()
    draw.text((60, 90), "शुद्ध प्राकृतिक चमक", fill="black", font=font)
    img.save(img_path)

    res = ocr.read_text(img_path)
    assert res["ok"] is True
    assert len(res["blocks"]) > 0
    # Confirms engine detected Devanagari text
    assert any("चमक" in b["text"] or "प्राकृतिक" in b["text"] or "शुद्ध" in b["text"] for b in res["blocks"])
    assert "hin" in res["engine"]["langs"]


def test_ocr_marathi_devanagari_traineddata_fixture(tmp_path):
    """Real fixture test using downloaded mar.traineddata."""
    img_path = str(tmp_path / "marathi_creative.png")
    img = Image.new("RGB", (900, 250), color="white")
    draw = ImageDraw.Draw(img)
    font_path = r"C:\Windows\Fonts\Nirmala.ttc"
    if os.path.exists(font_path):
        font = ImageFont.truetype(font_path, 44)
    else:
        font = ImageFont.load_default()
    draw.text((60, 90), "नैसर्गिक सौंदर्य आणि त्वचा काळजी", fill="black", font=font)
    img.save(img_path)

    res = ocr.read_text(img_path)
    assert res["ok"] is True
    assert len(res["blocks"]) > 0
    assert any("सौंदर्य" in b["text"] or "नैसर्गिक" in b["text"] or "काळजी" in b["text"] for b in res["blocks"])
    assert "mar" in res["engine"]["langs"]


def test_rapidocr_fallback_produces_valid_boxes(tmp_path, monkeypatch):
    """RapidOCR ONNX engine fallback produces pixel bounding boxes and confidence."""
    img_path = str(tmp_path / "rapid_sample.png")
    img = Image.new("RGB", (600, 180), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((40, 60), "PureGlow Herbal Essence", fill="black")
    img.save(img_path)

    monkeypatch.setattr(ocr.settings, "ocr_engine", "rapidocr")
    res = ocr.read_text(img_path)

    assert res["ok"] is True
    assert len(res["blocks"]) >= 1
    box = res["blocks"][0]["box"]
    assert "x" in box and "y" in box and "w" in box and "h" in box
    assert box["w"] > 0 and box["h"] > 0
    assert res["engine"]["name"] == "rapidocr"
    assert res["engine"]["fallback"] is True
