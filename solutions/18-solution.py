import sys

def main():
    data = sys.stdin.read().split()
    s = data[0] if data else ""
    first_idx = {0: -1}
    bal = 0
    best_len = 0
    best_start = -1
    for i, ch in enumerate(s):
        bal += 1 if ch == 'C' else -1
        if bal not in first_idx:
            first_idx[bal] = i
        else:
            start = first_idx[bal] + 1
            length = i - first_idx[bal]
            if length > best_len or (length == best_len and start < best_start):
                best_len = length
                best_start = start
    if best_len == 0:
        print("0 -1")
    else:
        print(f"{best_len} {best_start}")

if __name__ == "__main__":
    main()