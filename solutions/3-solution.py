import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    a = [int(x) for x in data[1:1 + n]]
    original = a[:]  # keep for sorting later

    if n == 0:
        print()
        print()
        print()
        return

    pivot = a[-1]
    i = -1
    for j in range(n - 1):
        if a[j] <= pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    i += 1
    a[i], a[-1] = a[-1], a[i]

    pivot_index = i
    sorted_arr = sorted(original)

    out_lines = [
        str(pivot_index),
        ' '.join(map(str, a)),
        ' '.join(map(str, sorted_arr))
    ]
    sys.stdout.write('\n'.join(out_lines))

if __name__ == "__main__":
    main()