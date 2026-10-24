import sys

def solve():
    s = sys.stdin.readline().strip()
    opening = set('({[')
    closing = set(')}]')
    stack = []
    out = []
    groups = 0
    for ch in s:
        if ch in opening:
            if not stack:
                groups += 1
            else:
                out.append(ch)
            stack.append(ch)
        elif ch in closing:
            if stack:
                stack.pop()
            if not stack:
                continue
            out.append(ch)
        else:
            out.append(ch)
    result = ''.join(out) if out else 'EMPTY'
    sys.stdout.write(str(groups) + '\n' + result)

if __name__ == "__main__":
    solve()