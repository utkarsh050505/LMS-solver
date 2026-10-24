import sys

def check(doc: str) -> str:
    stack = []
    i = 0
    tag_idx = 0
    n = len(doc)
    while i < n:
        if doc[i] == '<':
            j = doc.find('>', i + 1)
            # According to problem statement, every '<' is well-formed
            tag_content = doc[i + 1:j]
            tag_idx += 1
            if tag_content.startswith('/'):
                name = tag_content[1:]
                if not stack or stack[-1] != name:
                    return f"MISMATCH {tag_idx}"
                stack.pop()
            else:
                name = tag_content
                stack.append(name)
            i = j + 1
        else:
            i += 1
    if stack:
        return f"UNCLOSED {len(stack)}"
    return "VALID"

def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0])
    out = []
    for i in range(1, t + 1):
        out.append(check(data[i].strip()))
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()