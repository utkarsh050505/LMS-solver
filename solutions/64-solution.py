import sys
from collections import deque

def main():
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    n, k = data[0], data[1]
    a = data[2:2 + n]
    best = [0] * n
    best[0] = a[0]
    dq = deque([0])
    for i in range(1, n):
        while dq and dq[0] < i - k:
            dq.popleft()
        best[i] = a[i] + best[dq[0]]
        while dq and best[dq[-1]] <= best[i]:
            dq.pop()
        dq.append(i)
    sys.stdout.write(str(best[-1]))

if __name__ == "__main__":
    main()