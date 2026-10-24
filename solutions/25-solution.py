import sys

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    grid = []
    idx = 1
    for _ in range(n):
        grid.append([data[idx + j].decode() for j in range(n)])
        idx += n

    out = []
    for i in range(n):
        row = [grid[n - 1 - j][i] for j in range(n)]
        out.append(" ".join(row))

    sys.stdout.write("\n".join(out) + "\n")

if __name__ == "__main__":
    solve()