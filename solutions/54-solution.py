import sys
from collections import deque

def main():
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    n, g0, g1 = data[0], data[1], data[2]
    a = data[3:3 + n]
    lane = data[3 + n:3 + 2 * n]

    q = [deque(), deque()]
    ans = [0] * n
    i = 0          # index of next car to arrive
    processed = 0
    t = 0
    cycle = g0 + g1

    while processed < n:
        if not q[0] and not q[1] and i < n and t < a[i]:
            t = a[i]  # jump to next arrival time when idle

        while i < n and a[i] == t:
            q[lane[i]].append(i)
            i += 1

        green = 0 if (t % cycle) < g0 else 1
        if q[green]:
            idx = q[green].popleft()
            ans[idx] = t
            processed += 1

        t += 1

    sys.stdout.write(' '.join(map(str, ans)))

if __name__ == "__main__":
    main()