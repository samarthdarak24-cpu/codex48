import os
import re

ROOT = r"d:\tmp\codex48"

def update_shell():
    path = os.path.join(ROOT, "src", "components", "layout", "Shell.tsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern for the outside button in Shell.tsx
    pattern = r'[ \t]*{/\* Instant Persona Switcher Button \*/}.*?</button>[ \t]*\r?\n?'
    new_content, count = re.subn(pattern, '', content, flags=re.DOTALL)
    print(f'Shell.tsx: removed {count} outside switch button(s)')
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

def update_submissions():
    path = os.path.join(ROOT, "src", "pages", "content", "Submissions.tsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern for the redundant New Content button inside the table filter toolbar
    pattern = r'[ \t]*<Button className="w-full sm:w-auto sm:ml-auto" size="md" icon={<Plus className="h-3.5 w-3.5" />} onClick=\{.*?navigate\(\'/app/new\'\)\}>\s*New Content\s*</Button>[ \t]*\r?\n?'
    new_content, count = re.subn(pattern, '', content)
    print(f'Submissions.tsx: removed {count} duplicate toolbar button(s)')
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

if __name__ == '__main__':
    update_shell()
    update_submissions()
