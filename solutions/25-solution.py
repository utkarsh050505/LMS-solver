import sys

def solve():
    data = sys.stdin.read().strip().split()
    if not data:
        print(0)
        return
    nums = list(map(int, data))
    distinct = set(nums)
    mn = min(distinct)
    mx = max(distinct)
    missing = (mx - mn + 1) - len(distinct)
    print(missing)

if __name__ == "__main__":
    solve()