import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    max1 = -10**19
    max2 = -10**19
    for x in nums:
        if x > max1:
            max2 = max1
            max1 = x
        elif x > max2:
            max2 = x
    total = max1 + max2
    sys.stdout.write(f"{total}\n{max1} {max2}")

if __name__ == "__main__":
    main()