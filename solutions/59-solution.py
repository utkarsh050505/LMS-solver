import sys

def solve():
    s = sys.stdin.readline().strip()
    opening = set('([{')
    closing = {')': '(', ']': '[', '}': '{'}

    depth = 0
    max_depth = 0
    snap_idx = -1

    for i, ch in enumerate(s):
        if ch in opening:
            depth += 1
            if depth > max_depth:
                max_depth = depth
                snap_idx = i
        elif ch in closing:
            depth -= 1

    out = [str(max_depth)]
    if max_depth == 0:
        out.append("NONE")
    else:
        stack = []
        for ch in s[:snap_idx + 1]:
            if ch in opening:
                stack.append(ch)
            elif ch in closing:
                if stack and stack[-1] == closing[ch]:
                    stack.pop()
        out.append(''.join(stack))
    sys.stdout.write('\n'.join(out))

if __name__ == "__main__":
    solve()