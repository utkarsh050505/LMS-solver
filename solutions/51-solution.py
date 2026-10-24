import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    if n == 0:
        print()
        return
    nums = list(map(int, data[1:1 + n]))
    nums.reverse()
    sys.stdout.write(' '.join(map(str, nums)))

if __name__ == "__main__":
    solve()