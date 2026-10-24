import sys
from collections import deque

def solve():
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    s, q = data[0], data[1]
    targets = data[2:2 + q]
    LIMIT = 200000
    INF = 10**9
    dist = [INF] * (LIMIT + 1)
    dist[s] = 0
    dq = deque([s])
    while dq:
        x = dq.popleft()
        d = dist[x]
        # free jump
        nx = x * 2
        if nx <= LIMIT and d < dist[nx]:
            dist[nx] = d
            dq.appendleft(nx)
        # step left
        nx = x - 1
        if nx >= 0 and d + 1 < dist[nx]:
            dist[nx] = d + 1
            dq.append(nx)
        # step right
        nx = x + 1
        if nx <= LIMIT and d + 1 < dist[nx]:
            dist[nx] = d + 1
            dq.append(nx)
    out = "\n".join(str(dist[t]) for t in targets)
    sys.stdout.write(out)

if __name__ == "__main__":
    solve()