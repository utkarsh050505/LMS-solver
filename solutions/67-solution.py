import sys

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    intervals = []
    idx = 1
    for _ in range(n):
        a = int(data[idx]); b = int(data[idx + 1])
        intervals.append((a, b))
        idx += 2
    intervals.sort(key=lambda x: (x[0], x[1]))
    merged = []
    cs, ce = intervals[0]
    for a, b in intervals[1:]:
        if a <= ce:
            if b > ce:
                ce = b
        else:
            merged.append((cs, ce))
            cs, ce = a, b
    merged.append((cs, ce))
    out_lines = [str(len(merged))]
    out_lines += [f"{s} {e}" for s, e in merged]
    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    main()