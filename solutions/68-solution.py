import sys

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    a = list(map(int, data[1:1 + n]))
    blocks = []
    i = 0
    while i < n:
        pc = a[i].bit_count()
        cur_min = cur_max = a[i]
        i += 1
        while i < n and a[i].bit_count() == pc:
            val = a[i]
            if val < cur_min:
                cur_min = val
            if val > cur_max:
                cur_max = val
            i += 1
        blocks.append((cur_min, cur_max))
    for k in range(len(blocks) - 1):
        if blocks[k][1] > blocks[k + 1][0]:
            print("NO")
            return
    print("YES")

if __name__ == "__main__":
    solve()