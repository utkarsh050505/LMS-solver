import sys

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    P = int(next(it))
    n = int(next(it))
    q = int(next(it))
    frames = [int(next(it)) for _ in range(n)]
    limit = n * P
    mask = P - 1
    shift = P.bit_length() - 1  # since P is power of two
    out_lines = []
    for _ in range(q):
        a = int(next(it))
        if a >= limit:
            out_lines.append("SEGV")
        else:
            page = a >> shift
            offset = a & mask
            f = frames[page]
            if f == -1:
                out_lines.append(f"FAULT {page}")
            else:
                out_lines.append(str(f * P + offset))
    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    solve()