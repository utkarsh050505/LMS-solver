import sys

def main():
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    n = data[0]
    r = data[1:1 + n]
    pickup = [0] * n
    max_wait = -1
    token_with_max = 1
    for i in range(n):
        if i == 0:
            pickup[i] = r[i]
        else:
            pickup[i] = r[i] if r[i] > pickup[i - 1] else pickup[i - 1]
        wait = pickup[i] - r[i]
        if wait > max_wait:
            max_wait = wait
            token_with_max = i + 1
    out = []
    out.append(" ".join(map(str, pickup)))
    out.append(f"{max_wait} {token_with_max}")
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()