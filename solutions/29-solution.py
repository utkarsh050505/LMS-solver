import sys

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    R = int(data[0])
    C = int(data[1])
    idx = 2
    row_sums = [0] * R
    col_sums = [0] * C
    grand = 0

    for r in range(R):
        r_sum = 0
        for c in range(C):
            val = int(data[idx])
            idx += 1
            r_sum += val
            col_sums[c] += val
        row_sums[r] = r_sum
        grand += r_sum

    sys.stdout.write(" ".join(map(str, row_sums)) + "\n")
    sys.stdout.write(" ".join(map(str, col_sums)) + "\n")
    sys.stdout.write(str(grand) + "\n")

if __name__ == "__main__":
    solve()