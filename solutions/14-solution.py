import sys, heapq

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))
    procs = []
    for idx in range(n):
        pid = next(it)
        arrival = int(next(it))
        burst = int(next(it))
        procs.append((pid, arrival, burst, idx))
    procs_by_arrival = sorted(procs, key=lambda x: (x[1], x[3]))
    heap = []
    i = 0
    time = 0
    completed = 0
    completion = [0] * n
    turnaround = [0] * n
    waiting = [0] * n
    while completed < n:
        while i < n and procs_by_arrival[i][1] <= time:
            pid, arr, burst, idx = procs_by_arrival[i]
            heapq.heappush(heap, (burst, arr, idx, pid))
            i += 1
        if heap:
            burst, arr, idx, pid = heapq.heappop(heap)
            comp = time + burst
            completion[idx] = comp
            turnaround[idx] = comp - arr
            waiting[idx] = turnaround[idx] - burst
            time = comp
            completed += 1
        else:
            time = procs_by_arrival[i][1]
    out = []
    total_wait = 0
    total_turn = 0
    for pid, arr, burst, idx in procs:
        comp = completion[idx]
        turn = turnaround[idx]
        wait = waiting[idx]
        total_wait += wait
        total_turn += turn
        out.append(f"{pid} {comp} {turn} {wait}")
    out.append(f"{total_wait / n:.4f} {total_turn / n:.4f}")
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()