import sys

def solve():
    data = sys.stdin.read().strip().split()
    s = data[0] if data else ""
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for ch in s:
        if ch in pairs.values():
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                print("false")
                return
            stack.pop()
        else:
            # invalid character, treat as false
            print("false")
            return
    print("true" if not stack else "false")

if __name__ == "__main__":
    solve()