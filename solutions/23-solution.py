import sys
import math

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    vals = [int(x) for x in data[1:1 + n]]
    if not vals:
        return
    g = vals[0]
    l = vals[0]
    for v in vals[1:]:
        g = math.gcd(g, v)
        l = (l // math.gcd(l, v)) * v
    sys.stdout.write(f"{g} {l}\n")

if __name__ == "__main__":
    solve()