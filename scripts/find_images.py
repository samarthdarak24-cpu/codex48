import re

with open('src/pages/marketing/Home.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r'/images/[a-zA-Z0-9_\-\./]+', text)
for m in sorted(set(matches)):
    print(m)
