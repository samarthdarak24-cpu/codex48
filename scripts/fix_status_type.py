with open('src/v2/components/views/manager/ExceptionsView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("{ status: 'Pending',", "{ status: 'Pending' as const,")
text = text.replace("{ status: 'Approved',", "{ status: 'Approved' as const,")
text = text.replace("{ status: 'Rejected',", "{ status: 'Rejected' as const,")

with open('src/v2/components/views/manager/ExceptionsView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('[OK] Fixed status as const in ExceptionsView.tsx')
