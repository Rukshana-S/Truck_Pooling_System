import ast

for p in ['app/(protected)/earnings/page.jsx', 'app/(protected)/analytics/page.jsx']:
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    if content.startswith('"use client";\n'):
        content = content[14:]
    if content.startswith('"') and content.endswith('"'):
        content = ast.literal_eval(content)
    content = '"use client";\n' + content
    with open(p, 'w', encoding='utf-8') as f:
        f.write(content)
print('Fixed files with Python')
