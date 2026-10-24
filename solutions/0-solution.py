import sys

def solve(s: str) -> str:
    l, r = 0, len(s) - 1
    res = []
    while l <= r:
        if s[l] < s[r]:
            res.append(s[l])
            l += 1
        elif s[l] > s[r]:
            res.append(s[r])
            r -= 1
        else:
            i = 0
            while l + i <= r - i and s[l + i] == s[r - i]:
                i += 1
            if l + i > r - i:  # all equal
                res.append(s[l])
                l += 1
            elif s[l + i] < s[r - i]:
                res.append(s[l])
                l += 1
            else:
                res.append(s[r])
                r -= 1
    return ''.join(res)

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    t = int(data[0])
    outputs = [solve(data[i + 1]) for i in range(t)]
    sys.stdout.write("\n".join(outputs))

if __name__ == "__main__":
    main()