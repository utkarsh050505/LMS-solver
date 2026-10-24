import sys
from collections import deque

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))
    q = int(next(it))
    pid = []
    arrival = []
    burst = []
    for _ in range(n):
        pid.append(next(it))
        arrival.append(int(next(it)))
        burst.append(int(next(it)))
    remaining = burst[:]
    completion = [None] * n

    # indices sorted by arrival time
    sorted_idx = sorted(range(n), key=lambda i: arrival[i])
    pos = 0  # pointer in sorted_idx
    ready = deque()
    cur = 0
    dispatches = 0

    while ready or pos < n:
        if not ready:
            # jump to next arrival time
            cur = max(cur, arrival[sorted_idx[pos]])
            while pos < n and arrival[sorted_idx[pos]] <= cur:
                ready.append(sorted_idx[pos])
                pos += 1
            continue

        idx = ready.popleft()
        slice_time = q if remaining[idx] > q else remaining[idx]
        remaining[idx] -= slice_time
        cur += slice_time
        dispatches += 1

        # add newly arrived processes (including those arriving exactly at cur)
        while pos < n and arrival[sorted_idx[pos]] <= cur:
            ready.append(sorted_idx[pos])
            pos += 1

        if remaining[idx] == 0:
            completion[idx] = cur
        else:
            ready.append(idx)

    out_lines = []
    for i in range(n):
        comp = completion[i]
        tat = comp - arrival[i]
        wait = tat - burst[i]
        out_lines.append(f"{pid[i]} {comp} {tat} {wait}")
    out_lines.append(str(dispatches))
    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    solve()