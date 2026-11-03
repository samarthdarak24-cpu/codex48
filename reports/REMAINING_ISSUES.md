# REMAINING ISSUES & MAINTENANCE RECOMMENDATIONS

1. **Cold Start Backend Spin-up:**
   - Free tier Render backends sleep after 15 minutes of inactivity, causing the first request to take 30-50s.
   - Recommended: Upgrade to Render Starter or configure a lightweight uptime ping.
2. **Mobile Keyboard Viewport Adjustment:**
   - On small virtual keyboards (< 380px width), some modal footers require vertical scrolling. Fixed using responsive flex layouts.
