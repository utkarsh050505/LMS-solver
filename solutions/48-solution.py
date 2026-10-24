import sys

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    head = int(data[1])
    value = [0] * n
    nxt = [0] * n
    p = 2
    for i in range(n):
        value[i] = int(data[p])
        nxt[i] = int(data[p + 1])
        p += 2

    slow = head
    fast = head
    while fast != -1 and nxt[fast] != -1:
        slow = nxt[slow]
        fast = nxt[nxt[fast]]

    # Output middle slot and its value
    out_lines = []
    out_lines.append(f"{slow} {value[slow]}")

    # Collect values from middle to end
    vals = []
    cur = slow
    while cur != -1:
        vals.append(str(value[cur]))
        cur = nxt[cur]
    out_lines.append(" ".join(vals))

    sys.stdout.write("\n".join(out_lines))

if __name__ == "__main__":
    main()