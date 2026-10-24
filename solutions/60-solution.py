import sys

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    x = int(data[1])
    positions = list(map(int, data[2:2 + n]))
    positions.sort()
    groups = 1
    cur_size = 1
    max_size = 1
    for i in range(1, n):
        if positions[i] - positions[i - 1] > x:
            groups += 1
            if cur_size > max_size:
                max_size = cur_size
            cur_size = 1
        else:
            cur_size += 1
    if cur_size > max_size:
        max_size = cur_size
    sys.stdout.write(str(groups) + "\n" + str(max_size))

if __name__ == "__main__":
    main()