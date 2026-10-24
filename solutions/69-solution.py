import sys

def compute_pi(p):
    m = len(p)
    pi = [0] * m
    for i in range(1, m):
        j = pi[i - 1]
        while j > 0 and p[i] != p[j]:
            j = pi[j - 1]
        if p[i] == p[j]:
            j += 1
        pi[i] = j
    return pi

def main():
    data = sys.stdin.read().split()
    if len(data) < 2:
        return
    a, b = data[0], data[1]
    m = len(b)
    pi = compute_pi(b)
    stack = []  # each element: (char, matched_len)
    for ch in a:
        prev = stack[-1][1] if stack else 0
        while prev > 0 and ch != b[prev]:
            prev = pi[prev - 1]
        if ch == b[prev]:
            prev += 1
        else:
            prev = 0
        stack.append((ch, prev))
        if prev == m:
            for _ in range(m):
                stack.pop()
    result = ''.join(ch for ch, _ in stack)
    print(result if result else "EMPTY")

if __name__ == "__main__":
    main()