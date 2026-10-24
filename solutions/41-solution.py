import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    k = int(data[1])
    a = data[2:2 + n]
    if n > 0:
        k %= n
        if k > 0:
            a = a[n - k:] + a[:n - k]
    sys.stdout.write(" ".join(a) + "\n")

if __name__ == "__main__":
    solve()