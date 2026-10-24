import sys

def solve():
    s = sys.stdin.readline().strip()
    MOD = 10**9 + 7
    stack = [[None, 0]]  # each element: [opening_char, accumulated_score]
    for ch in s:
        if ch == '(' or ch == '[':
            stack.append([ch, 0])
        else:  # closing bracket
            typ, inner = stack.pop()
            if inner == 0:
                val = 1
            else:
                mult = 2 if typ == '(' else 3
                val = (inner * mult) % MOD
            stack[-1][1] = (stack[-1][1] + val) % MOD
    print(stack[0][1] % MOD)

if __name__ == "__main__":
    solve()