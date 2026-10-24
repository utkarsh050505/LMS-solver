import sys

def to_min(t: bytes) -> int:
    h, m = t.split(b':')
    return int(h) * 60 + int(m)

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    total = 0
    overnight = 0
    idx = 1
    for _ in range(n):
        start = to_min(data[idx]); end = to_min(data[idx + 1])
        idx += 2
        if end <= start:
            overnight += 1
            end += 1440
        total += end - start
    sys.stdout.write(f"{total} {overnight}")

if __name__ == "__main__":
    main()