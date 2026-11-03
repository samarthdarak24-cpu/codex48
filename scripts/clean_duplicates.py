import os

ROOT = r"d:\tmp\codex48"

def update_overview():
    path = os.path.join(ROOT, "src", "pages", "content", "Overview.tsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    old_block = """                <div className="space-y-1.5">
                  <Button block icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => navigate('/app/new')}>
                    New Content
                  </Button>
                  <Button block variant="outline" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => navigate('/app/feedback')}>
                    Check Content
                  </Button>
                </div>"""

    new_block = """                <div className="space-y-1.5">
                  <Button block variant="outline" icon={<BookOpen className="h-3.5 w-3.5" />} onClick={() => navigate('/app/guidelines')}>
                    Brand Guidelines
                  </Button>
                  <Button block variant="outline" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => navigate('/app/feedback')}>
                    Check Content
                  </Button>
                </div>"""

    # Normalize CRLF
    content_norm = content.replace("\r\n", "\n")
    old_norm = old_block.replace("\r\n", "\n")
    new_norm = new_block.replace("\r\n", "\n")

    if old_norm in content_norm:
        content_norm = content_norm.replace(old_norm, new_norm)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content_norm.replace("\n", "\r\n"))
        print("Overview.tsx: successfully replaced duplicate New Content button in Quick actions!")
    else:
        print("Overview.tsx: target block not found")

if __name__ == '__main__':
    update_overview()
