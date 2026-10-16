import sys, bisect

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    M = int(data[0])
    q = int(data[1])
    idx = 2

    free_list = [(0, M)]          # list of (start, end), sorted by start
    allocated = {}                # id -> (start, size)
    out_lines = []

    for _ in range(q):
        op = data[idx]
        if op == 'A':
            ident = data[idx + 1]
            size = int(data[idx + 2])
            idx += 3
            placed = False
            for i, (s, e) in enumerate(free_list):
                if e - s >= size:
                    start_addr = s
                    if e - s == size:
                        del free_list[i]
                    else:
                        free_list[i] = (s + size, e)
                    allocated[ident] = (start_addr, size)
                    out_lines.append(f"{ident} {start_addr}")
                    placed = True
                    break
            if not placed:
                out_lines.append(f"{ident} FAIL")
        else:  # 'F'
            ident = data[idx + 1]
            idx += 2
            s, sz = allocated.pop(ident)
            new_start = s
            new_end = s + sz

            starts = [seg[0] for seg in free_list]
            pos = bisect.bisect_left(starts, new_start)

            # merge with left neighbour if adjacent
            if pos > 0 and free_list[pos - 1][1] == new_start:
                left_start, left_end = free_list[pos - 1]
                new_start = left_start
                del free_list[pos - 1]
                pos -= 1

            # merge with right neighbour if adjacent
            if pos < len(free_list) and free_list[pos][0] == new_end:
                right_start, right_end = free_list[pos]
                new_end = right_end
                del free_list[pos]

            free_list.insert(pos, (new_start, new_end))

    holes = len(free_list)
    largest = max((e - s) for s, e in free_list) if free_list else 0
    out_lines.append(f"{holes} {largest}")

    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    solve()