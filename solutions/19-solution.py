import sys

def main():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    s = data[0]
    if not s:
        print()
        return
    res = []
    cur = s[0]
    cnt = 1
    for ch in s[1:]:
        if ch == cur:
            cnt += 1
        else:
            res.append(f"{cur}{cnt}")
            cur = ch
            cnt = 1
    res.append(f"{cur}{cnt}")
    sys.stdout.write(''.join(res))

if __name__ == "__main__":
    main()