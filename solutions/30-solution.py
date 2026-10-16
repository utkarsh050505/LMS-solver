import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    names = data[1:1 + n]

    freq = {}
    for name in names:
        freq[name] = freq.get(name, 0) + 1

    best_name = None
    best_count = -1
    for name, cnt in freq.items():
        if cnt > best_count or (cnt == best_count and name < best_name):
            best_name = name
            best_count = cnt

    sys.stdout.write(f"{best_name} {best_count}")

if __name__ == "__main__":
    main()