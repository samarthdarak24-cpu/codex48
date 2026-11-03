import sys
sys.path.insert(0, "backend")

from app.services.privacy import redact_pii, privacy_status

sample = "Contact Dr. Priya at priya@brand.com or call +1 555-123-4567. PAN: ABCDE1234F."
res = redact_pii(sample)
print("Privacy Status:", privacy_status())
print("Entities Found:", res["entities_found"])
print("Redacted Result:", res["redacted_text"])
