import sys

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    head = int(data[1])
    tail = int(data[2])
    if n == 0:
        sys.stdout.write("0 0\n\n\n")
        return
    value = [0] * n
    prv = [0] * n
    nxt = [0] * n
    p = 3
    for i in range(n):
        value[i] = int(data[p]); prv[i] = int(data[p + 1]); nxt[i] = int(data[p + 2]); p += 3

    hills = []
    valleys = []

    cur = head
    while cur != -1:
        start = cur
        val = value[cur]
        # advance to the end of the plateau
        while nxt[cur] != -1 and value[nxt[cur]] == val:
            cur = nxt[cur]
        end = cur

        left_idx = prv[start]
        right_idx = nxt[end]

        if left_idx != -1 and right_idx != -1:
            left_val = value[left_idx]
            right_val = value[right_idx]
            if val > left_val and val > right_val:
                hills.append(start)
            elif val < left_val and val < right_val:
                valleys.append(start)

        cur = right_idx

    out_lines = []
    out_lines.append(f"{len(hills)} {len(valleys)}")
    out_lines.append(" ".join(map(str, hills)))
    out_lines.append(" ".join(map(str, valleys)))
    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    solve()