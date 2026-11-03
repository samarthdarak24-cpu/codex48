with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app_text = f.read()

if 'import Home from' not in app_text:
    app_text = app_text.replace(
        "import LoginPage from '@/pages/Login'",
        "import Home from '@/pages/marketing/Home'\nimport LoginPage from '@/pages/Login'"
    )
    app_text = app_text.replace(
        '<Route path="/" element={<Navigate to="/login" replace />} />',
        '<Route path="/" element={<Home />} />\n      <Route path="/home" element={<Home />} />'
    )
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(app_text)
    print('[OK] App.tsx updated with Home route')
else:
    print('[INFO] Home already in App.tsx')

with open('src/components/marketing/MarketingNav.tsx', 'r', encoding='utf-8') as f:
    nav_text = f.read()

nav_text = nav_text.replace("'/app/overview'", "'/creator/dashboard'")
with open('src/components/marketing/MarketingNav.tsx', 'w', encoding='utf-8') as f:
    f.write(nav_text)
print('[OK] MarketingNav.tsx updated with creator dashboard link')
