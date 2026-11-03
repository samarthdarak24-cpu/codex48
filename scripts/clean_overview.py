with open('src/pages/content/Overview.tsx', 'rb') as f:
    data = f.read()

target = (
    b'<Button block icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => navigate(\'/app/new\')}>\r\n'
    b'                    New Content\r\n'
    b'                  </Button>'
)
replacement = (
    b'<Button block variant="outline" icon={<BookOpen className="h-3.5 w-3.5" />} onClick={() => navigate(\'/app/guidelines\')}>\r\n'
    b'                    Brand Guidelines\r\n'
    b'                  </Button>'
)

if target in data:
    data = data.replace(target, replacement)
    with open('src/pages/content/Overview.tsx', 'wb') as f:
        f.write(data)
    print("Replaced target in Overview.tsx!")
else:
    # try with \n
    target_lf = target.replace(b'\r\n', b'\n')
    replacement_lf = replacement.replace(b'\r\n', b'\n')
    if target_lf in data:
        data = data.replace(target_lf, replacement_lf)
        with open('src/pages/content/Overview.tsx', 'wb') as f:
            f.write(data)
        print("Replaced target (LF) in Overview.tsx!")
    else:
        print("Target not found in Overview.tsx!")
