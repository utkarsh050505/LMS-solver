import sys

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))
    head = int(next(it))
    tail = int(next(it))
    # allocate arrays
    prv = [0] * n
    nxt = [0] * n
    # values are irrelevant for the solution
    for i in range(n):
        _ = next(it)  # value, ignore
        prv[i] = int(next(it))
        nxt[i] = int(next(it))
    q = int(next(it))
    # compute positions by traversing from head
    pos = [0] * n
    cur = head
    idx = 0
    while cur != -1:
        pos[cur] = idx
        idx += 1
        cur = nxt[cur]
    out_lines = []
    for _ in range(q):
        a = int(next(it))
        b = int(next(it))
        out_lines.append(str(pos[b] - pos[a]))
    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    main()