"""Catalogue of condition types and Pydantic schemas.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §7.1.
Exposed via GET /api/v1/rules/condition-types for the rule editor.
"""
from typing import Annotated, List, Literal, Optional, Union
from pydantic import BaseModel, Field


class ForbiddenPhraseConfig(BaseModel):
    condition_type: Literal["forbidden_phrase"] = "forbidden_phrase"
    phrases: List[str] = Field(default_factory=list, description="List of prohibited phrases or keywords")
    match: Literal["exact", "word", "regex"] = "word"
    case_sensitive: bool = False


class RequiredPhraseConfig(BaseModel):
    condition_type: Literal["required_phrase"] = "required_phrase"
    phrases: List[str] = Field(default_factory=list, description="List of required phrases")
    mode: Literal["any", "all"] = "any"


class AbsoluteClaimConfig(BaseModel):
    condition_type: Literal["absolute_claim"] = "absolute_claim"
    patterns: List[str] = Field(
        default_factory=lambda: ["100% safe", "guaranteed", "cures", "miracle", "permanent result"],
        description="Patterns of absolute or unsubstantiated claims"
    )
    allow_if_claim_id: Optional[str] = Field(None, description="Permit if an approved claim is cited")


class LengthLimitConfig(BaseModel):
    condition_type: Literal["length_limit"] = "length_limit"
    min: Optional[int] = None
    max: Optional[int] = None
    field: str = "copy.text"


class ColorPaletteConfig(BaseModel):
    condition_type: Literal["color_palette"] = "color_palette"
    allowed_hex: List[str] = Field(default_factory=list, description="Approved hex colors, e.g. ['#2C5E3B']")
    tolerance_dE: float = Field(10.0, description="Delta E color difference threshold")
    min_coverage_pct: float = Field(5.0, description="Minimum color coverage percentage to flag")
    use_brand_kit: bool = True


class LogoRequiredConfig(BaseModel):
    condition_type: Literal["logo_required"] = "logo_required"
    logo_ids: List[str] = Field(default_factory=list)
    min_match_confidence: float = Field(0.70, description="Minimum match confidence threshold")


class LogoSizeConfig(BaseModel):
    condition_type: Literal["logo_size"] = "logo_size"
    min_width_ratio: float = Field(0.12, description="Minimum logo width relative to image width")
    min_clear_space_ratio: float = Field(0.15, description="Minimum clear space around logo")


class MinContrastConfig(BaseModel):
    condition_type: Literal["min_contrast"] = "min_contrast"
    ratio: float = Field(4.5, description="Minimum contrast ratio (WCAG AA is 4.5)")


class MinTextSizeConfig(BaseModel):
    condition_type: Literal["min_text_size"] = "min_text_size"
    min_height_ratio: float = Field(0.015, description="Minimum text block height relative to image")
    applies_to: Literal["disclaimer", "all"] = "disclaimer"


class SafeAreaConfig(BaseModel):
    condition_type: Literal["safe_area"] = "safe_area"
    margin_ratio: float = Field(0.05, description="Margin ratio on all sides where text/logo must not intrude")


class ChannelAllowedConfig(BaseModel):
    condition_type: Literal["channel_allowed"] = "channel_allowed"
    channels: List[str] = Field(default_factory=list, description="Permitted channels for this rule")


class RequiredMetadataConfig(BaseModel):
    condition_type: Literal["required_metadata"] = "required_metadata"
    fields: List[str] = Field(default_factory=list, description="Required metadata attributes")


class ApprovedAssetOnlyConfig(BaseModel):
    condition_type: Literal["approved_asset_only"] = "approved_asset_only"


ConditionConfig = Annotated[
    Union[
        ForbiddenPhraseConfig,
        RequiredPhraseConfig,
        AbsoluteClaimConfig,
        LengthLimitConfig,
        ColorPaletteConfig,
        LogoRequiredConfig,
        LogoSizeConfig,
        MinContrastConfig,
        MinTextSizeConfig,
        SafeAreaConfig,
        ChannelAllowedConfig,
        RequiredMetadataConfig,
        ApprovedAssetOnlyConfig,
    ],
    Field(discriminator="condition_type"),
]


def get_condition_type_catalogue() -> List[dict]:
    """Returns documentation and schema for all supported condition types."""
    return [
        {
            "condition_type": "forbidden_phrase",
            "description": "Flags prohibited words, phrases, or regex patterns in copy or OCR text.",
            "required_facts": ["copy.text", "ocr.text"],
            "sample_config": {"phrases": ["guaranteed", "100% cure"], "match": "word", "case_sensitive": False},
        },
        {
            "condition_type": "required_phrase",
            "description": "Requires specific phrases or mandatory disclaimers to be present.",
            "required_facts": ["copy.text", "ocr.text"],
            "sample_config": {"phrases": ["Terms apply", "T&C apply"], "mode": "any"},
        },
        {
            "condition_type": "absolute_claim",
            "description": "Catches absolute claims unless backed by an approved claim in the registry.",
            "required_facts": ["copy.text"],
            "sample_config": {"patterns": ["100% safe", "miracle", "cures"], "allow_if_claim_id": None},
        },
        {
            "condition_type": "length_limit",
            "description": "Restricts copy length to minimum or maximum character/word bounds.",
            "required_facts": ["copy.text"],
            "sample_config": {"min": 10, "max": 280, "field": "copy.text"},
        },
        {
            "condition_type": "color_palette",
            "description": "Verifies dominant colors match approved brand palette within ΔE tolerance.",
            "required_facts": ["visual.palette"],
            "sample_config": {"allowed_hex": ["#2C5E3B", "#F4F7F2"], "tolerance_dE": 10.0, "use_brand_kit": True},
        },
        {
            "condition_type": "logo_required",
            "description": "Verifies official brand logo is present with sufficient confidence.",
            "required_facts": ["visual.logo_matches"],
            "sample_config": {"logo_ids": [], "min_match_confidence": 0.70},
        },
        {
            "condition_type": "logo_size",
            "description": "Ensures logo adheres to minimum width and clear space padding ratios.",
            "required_facts": ["visual.logo_matches", "visual.image_size"],
            "sample_config": {"min_width_ratio": 0.12, "min_clear_space_ratio": 0.15},
        },
        {
            "condition_type": "min_contrast",
            "description": "Verifies contrast ratio between text and background meets readability standards.",
            "required_facts": ["visual.contrast"],
            "sample_config": {"ratio": 4.5},
        },
        {
            "condition_type": "min_text_size",
            "description": "Checks minimum height ratio for text blocks or disclaimers.",
            "required_facts": ["visual.ocr_blocks"],
            "sample_config": {"min_height_ratio": 0.015, "applies_to": "disclaimer"},
        },
        {
            "condition_type": "safe_area",
            "description": "Ensures text and logos do not breach edge safe zone margins.",
            "required_facts": ["visual.ocr_blocks", "visual.logo_matches"],
            "sample_config": {"margin_ratio": 0.05},
        },
        {
            "condition_type": "channel_allowed",
            "description": "Restricts content to permitted communication channels.",
            "required_facts": ["meta.channel"],
            "sample_config": {"channels": ["Instagram", "LinkedIn", "Email"]},
        },
        {
            "condition_type": "required_metadata",
            "description": "Requires specific metadata fields such as product, audience, or campaign.",
            "required_facts": ["meta.*"],
            "sample_config": {"fields": ["campaign_id", "product"]},
        },
        {
            "condition_type": "approved_asset_only",
            "description": "Verifies any attached brand or product images are approved in the library.",
            "required_facts": ["asset.status"],
            "sample_config": {},
        },
    ]

