import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    k = int(data[1])
    target = list(map(int, data[2:2 + k]))
    last = target[-1]
    target_set = set(target)
    script_chars = []
    for i in range(1, last + 1):
        script_chars.append('+')
        if i not in target_set:
            script_chars.append('-')
    pushes = last
    pops = last - k
    script = ''.join(script_chars)
    print(pushes, pops)
    print(script)

if __name__ == "__main__":
    main()