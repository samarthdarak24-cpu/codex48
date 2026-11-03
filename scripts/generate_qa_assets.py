import os
from docx import Document
from PIL import Image, ImageDraw, ImageFont

os.makedirs("qa_test_assets", exist_ok=True)

# 1. Generate DOCX Guideline
doc = Document()
doc.add_heading("PureGlow Marketing Guidelines QA", level=0)
doc.add_paragraph("Brand: PureGlow QA | Category: Marketing | Version: 1.0")

doc.add_heading("Section 1 — Brand Governance Scope", level=1)
doc.add_paragraph(
    "These official marketing brand guidelines govern all digital, social media, "
    "and print advertising campaigns for PureGlow QA Winter Skincare Campaign QA."
)

doc.add_heading("Section 2 — Approved and Restricted Product Claims", level=1)
doc.add_paragraph(
    "CL-03: Only approved product claims. Marketing copy must match the verified approved "
    "claims list verbatim. Approved claims include: 'Supports healthy-looking skin', "
    "'Nourishes skin barrier naturally', and 'Formulated with organic botanicals'."
)
doc.add_paragraph(
    "CL-04: No unqualified superlatives. Terms such as 'India\\'s No. 1 Skin Care Product' "
    "or 'Market leader' require third-party audited retail volume substantiation on the same asset."
)
doc.add_paragraph(
    "CL-05: Substantiation required for absolute claims. Absolute statements including "
    "'100% Safe for Everyone', 'Zero irritation guaranteed', or 'Miracle treatment' "
    "are strictly prohibited without clinical trial documentation."
)

doc.add_heading("Section 3 — Visual Identity and Poster Clear Space", level=1)
doc.add_paragraph(
    "The official PureGlow wordmark must maintain a minimum isolation clear space of 24px on all "
    "campaign creatives. Primary forest green (#1F4D2B) and neutral sand (#F4EFE3) must form "
    "the core aesthetic palette."
)

doc.save("qa_test_assets/PureGlow_Marketing_Guidelines_QA.docx")
print("Saved qa_test_assets/PureGlow_Marketing_Guidelines_QA.docx")

# 2. Generate Poster Image 01 (Compliant claim: 'Supports healthy-looking skin.')
img1 = Image.new("RGB", (800, 1000), color=(244, 239, 227))  # Neutral sand
draw1 = ImageDraw.Draw(img1)
# Header
draw1.rectangle([(0, 0), (800, 140)], fill=(31, 77, 43))  # Forest green
draw1.text((50, 45), "PureGlow QA", fill=(255, 255, 255))
draw1.text((50, 85), "Winter Skincare Campaign QA", fill=(210, 230, 215))

# Body / Claim
draw1.rectangle([(80, 220), (720, 680)], fill=(255, 255, 255), outline=(180, 200, 180), width=3)
draw1.text((120, 280), "PURE BOTANICAL HYDRATION", fill=(31, 77, 43))
draw1.text((120, 360), "Supports healthy-looking skin.", fill=(20, 20, 20))
draw1.text((120, 420), "Infused with organic rosehip and jojoba seed oil.", fill=(80, 80, 80))
draw1.text((120, 480), "Dermatologically tested for winter nourishment.", fill=(80, 80, 80))

# Footer
draw1.rectangle([(0, 900), (800, 1000)], fill=(230, 225, 210))
draw1.text((50, 935), "PureGlow QA • 100% Recyclable Packaging", fill=(60, 80, 60))

img1.save("qa_test_assets/PureGlow_Poster_Image_01.png")
print("Saved qa_test_assets/PureGlow_Poster_Image_01.png")

# 3. Generate Poster Image 02 (Violating claims: 'India\'s No. 1' & '100% Safe for Everyone')
img2 = Image.new("RGB", (800, 1000), color=(253, 245, 240))  # Warm tint
draw2 = ImageDraw.Draw(img2)
# Header
draw2.rectangle([(0, 0), (800, 140)], fill=(180, 50, 40))  # Deep red banner
draw2.text((50, 45), "PureGlow QA", fill=(255, 255, 255))
draw2.text((50, 85), "Winter Skincare Promotion QA", fill=(255, 220, 220))

# Body / Claims
draw2.rectangle([(80, 220), (720, 680)], fill=(255, 255, 255), outline=(220, 180, 180), width=3)
draw2.text((120, 270), "SUPERIOR BEAUTY FORMULA", fill=(180, 50, 40))
draw2.text((120, 340), "India's No. 1 Skin Care Product.", fill=(10, 10, 10))
draw2.text((120, 420), "100% Safe for Everyone.", fill=(10, 10, 10))
draw2.text((120, 500), "Instant miracle glowing effect without side-effects.", fill=(60, 60, 60))

# Footer
draw2.rectangle([(0, 900), (800, 1000)], fill=(240, 220, 220))
draw2.text((50, 935), "PureGlow QA Mega Promotion • Limited Stock Available", fill=(100, 40, 40))

img2.save("qa_test_assets/PureGlow_Poster_Image_02.png")
print("Saved qa_test_assets/PureGlow_Poster_Image_02.png")
