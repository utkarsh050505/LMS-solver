import sys

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    start = int(data[1])
    cur = start
    lowest = start
    for i in range(n):
        m = int(data[2 + i])
        cur += m
        if cur < lowest:
            lowest = cur
    sys.stdout.write(f"{cur} {lowest}\n")

if __name__ == "__main__":
    solve()