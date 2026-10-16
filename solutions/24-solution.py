import json, sys

def erase_overlap_intervals(payload):
    intervals = payload.get("intervals", [])
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[1])
    kept = 0
    last_end = -10**18
    for s, e in intervals:
        if s >= last_end:
            kept += 1
            last_end = e
    return len(intervals) - kept

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read() or "{}")
    print(json.dumps(erase_overlap_intervals(payload), separators=(",", ":")))