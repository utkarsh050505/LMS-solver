import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    n = int(data[idx]); idx += 1
    procs = []
    for i in range(n):
        pid = data[idx]; arrival = int(data[idx + 1]); burst = int(data[idx + 2])
        idx += 3
        procs.append((pid, arrival, burst, i))
    # sort by arrival then original index
    sorted_procs = sorted(procs, key=lambda x: (x[1], x[3]))
    # results indexed by original order
    completions = [0] * n
    turnarounds = [0] * n
    waitings = [0] * n
    current_time = 0
    for pid, arrival, burst, orig_idx in sorted_procs:
        if current_time < arrival:
            current_time = arrival
        start = current_time
        completion = start + burst
        turnaround = completion - arrival
        waiting = start - arrival
        completions[orig_idx] = completion
        turnarounds[orig_idx] = turnaround
        waitings[orig_idx] = waiting
        current_time = completion
    out_lines = []
    total_wait = 0
    total_turn = 0
    for i in range(n):
        pid = procs[i][0]
        comp = completions[i]
        turn = turnarounds[i]
        wait = waitings[i]
        total_wait += wait
        total_turn += turn
        out_lines.append(f"{pid} {comp} {turn} {wait}")
    avg_wait = total_wait / n
    avg_turn = total_turn / n
    out_lines.append(f"{avg_wait:.4f} {avg_turn:.4f}")
    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    main()