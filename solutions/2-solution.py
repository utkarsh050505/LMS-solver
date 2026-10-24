import sys
from collections import deque

def solve():
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    N, m = data[0], data[1]
    jump = [0] * (N + 1)
    idx = 2
    for _ in range(m):
        a = data[idx]
        b = data[idx + 1]
        jump[a] = b
        idx += 2

    visited = [False] * (N + 1)
    q = deque()
    q.append((1, 0))
    visited[1] = True

    while q:
        pos, dist = q.popleft()
        if pos == N:
            print(dist)
            return
        for step in range(1, 7):
            nxt = pos + step
            if nxt > N:
                continue
            if jump[nxt]:
                nxt = jump[nxt]
            if not visited[nxt]:
                visited[nxt] = True
                q.append((nxt, dist + 1))
    print(-1)

if __name__ == "__main__":
    solve()