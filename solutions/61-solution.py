import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    students = list(map(int, data[1:1 + n]))
    boxes = list(map(int, data[1 + n:1 + 2 * n]))
    cnt0 = students.count(0)
    cnt1 = n - cnt0
    for b in boxes:
        if b == 0:
            if cnt0 == 0:
                break
            cnt0 -= 1
        else:
            if cnt1 == 0:
                break
            cnt1 -= 1
    print(cnt0 + cnt1)

if __name__ == "__main__":
    main()