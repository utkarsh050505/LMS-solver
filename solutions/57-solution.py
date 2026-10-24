import sys
from collections import deque

def main():
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    n, m, c = data[0], data[1], data[2]
    arr = data[3:3 + n]
    bus = data[3 + n:3 + n + m]

    out = ["MISSED"] * n
    q = deque()
    i = 0  # index for arrivals

    for t in bus:
        # enqueue arrivals up to time t
        while i < n and arr[i] <= t:
            q.append(i)
            i += 1
        # board up to c students
        seats = c
        while seats and q:
            idx = q.popleft()
            out[idx] = str(t)
            seats -= 1

    # remaining students (including those not yet arrived) stay as "MISSED"
    sys.stdout.write(" ".join(out))

if __name__ == "__main__":
    main()