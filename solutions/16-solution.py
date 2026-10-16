import sys

MOD = 1000000007

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    q = int(data[0])
    ns = list(map(int, data[1:1 + q]))
    max_n = max(ns) if ns else 0
    dp = [0] * (max_n + 1)
    dp[0] = 1
    for i in range(1, max_n + 1):
        total = dp[i - 1]
        if i >= 2:
            total += dp[i - 2]
        if i >= 3:
            total += dp[i - 3]
        dp[i] = total % MOD
    out = '\n'.join(str(dp[n]) for n in ns)
    sys.stdout.write(out)

if __name__ == "__main__":
    main()