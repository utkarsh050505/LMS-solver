import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    target = int(data[1])
    nums = list(map(int, data[2:2 + n]))
    lo, hi = 0, n - 1
    ans = -1
    while lo <= hi:
        mid = (lo + hi) // 2
        val = nums[mid]
        if val == target:
            ans = mid
            break
        elif val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    sys.stdout.write(str(ans))

if __name__ == "__main__":
    solve()