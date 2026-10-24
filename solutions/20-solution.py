import sys

def main():
    data = list(map(int, sys.stdin.buffer.read().split()))
    if not data:
        return
    n, k = data[0], data[1]
    units = data[2:2 + n]
    tickets = []
    for i, u in enumerate(units):
        passes = (u + k - 1) // k
        tickets.append((passes, i))
    tickets.sort(key=lambda x: (x[0], x[1]))
    out = ' '.join(str(idx + 1) for _, idx in tickets)
    sys.stdout.write(out)

if __name__ == "__main__":
    main()