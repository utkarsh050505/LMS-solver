import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    vals = [int(data[i]) for i in range(1, 1 + n)]
    x = int(data[1 + n]) if len(data) > 1 + n else None
    result = [str(v) for v in vals if v != x]
    sys.stdout.write(' '.join(result) if result else 'EMPTY')

if __name__ == "__main__":
    main()