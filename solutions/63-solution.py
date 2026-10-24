import sys

def solve(k, s):
    n = len(s)
    cur = 0
    diff = [0] * (n + 1)
    ans = 0
    for i in range(n):
        cur ^= diff[i]
        bit = ord(s[i]) - 48  # faster than int()
        if (bit ^ cur) == 0:  # OFF after current flips
            if i + k > n:
                return -1
            ans += 1
            cur ^= 1
            diff[i + k] ^= 1
    return ans

def main():
    data = sys.stdin.read().split()
    t = int(data[0])
    out = []
    idx = 1
    for _ in range(t):
        k = int(data[idx]); s = data[idx + 1]; idx += 2
        out.append(str(solve(k, s)))
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()