import sys

def solve():
    s = sys.stdin.read()
    if not s:
        return
    s = s.rstrip('\n')
    # In case there are multiple lines, take the first line as the string
    if '\n' in s:
        s = s.splitlines()[0]
    vowels = set('aeiouAEIOU')
    chars = list(s)
    i, j = 0, len(chars) - 1
    while i < j:
        while i < j and chars[i] not in vowels:
            i += 1
        while i < j and chars[j] not in vowels:
            j -= 1
        if i < j:
            chars[i], chars[j] = chars[j], chars[i]
            i += 1
            j -= 1
    sys.stdout.write(''.join(chars))

if __name__ == "__main__":
    solve()