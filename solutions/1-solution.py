import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))
    arr = [int(next(it)) for _ in range(n)]
    try:
        x = int(next(it))
    except StopIteration:
        x = None
    lo, hi = 0, n - 1
    ans = -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == x:
            ans = mid
            break
        elif arr[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    sys.stdout.write(str(ans))

if __name__ == "__main__":
    solve()