import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))
    q = int(next(it))
    fat = [int(next(it)) for _ in range(n)]
    starts = [int(next(it)) for _ in range(q)]

    reachable = [False] * n
    out_lines = []

    for start in starts:
        cur = start
        visited = set()
        chain = []
        while True:
            if cur < 0 or cur >= n:
                out_lines.append("RANGE")
                break
            if cur in visited:
                out_lines.append("LOOP")
                break
            if fat[cur] == -2:
                out_lines.append(f"FREE {cur}")
                break
            visited.add(cur)
            chain.append(cur)
            reachable[cur] = True
            nxt = fat[cur]
            if nxt == -1:
                out_lines.append(str(len(chain)) + " " + " ".join(map(str, chain)))
                break
            cur = nxt

    lost = sum(1 for i in range(n) if fat[i] != -2 and not reachable[i])
    out_lines.append(str(lost))
    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    solve()