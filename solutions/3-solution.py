import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    head = int(data[1])
    # disk size not needed for computation
    # cyl = int(data[2])
    reqs = list(map(int, data[3:3 + n]))
    total = 0
    reversals = 0
    last_dir = None  # +1 for up, -1 for down
    cur = head
    for r in reqs:
        diff = r - cur
        if diff != 0:
            total += abs(diff)
            dir_sign = 1 if diff > 0 else -1
            if last_dir is not None and dir_sign != last_dir:
                reversals += 1
            last_dir = dir_sign
        # if diff == 0, no movement, no direction change, skip
        cur = r
    # In case there were zero moves only, total already 0
    print(total)
    print(reversals)

if __name__ == "__main__":
    main()