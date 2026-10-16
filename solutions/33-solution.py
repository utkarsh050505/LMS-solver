import sys

def main():
    data = list(map(int, sys.stdin.buffer.read().split()))
    if not data:
        return
    idx = 0
    n = data[idx]; idx += 1
    head = data[idx]; idx += 1
    tail = data[idx]; idx += 1
    value = [0] * n
    prv = [0] * n
    nxt = [0] * n
    for i in range(n):
        value[i] = data[idx]; prv[i] = data[idx + 1]; nxt[i] = data[idx + 2]
        idx += 3
    lo = data[idx]; hi = data[idx + 1]

    if n == 0 or head == -1 or tail == -1:
        print("0 -1 -1")
        return

    cur = head
    while cur != -1 and value[cur] < lo:
        cur = nxt[cur]
    new_head = cur

    cur = tail
    while cur != -1 and value[cur] > hi:
        cur = prv[cur]
    new_tail = cur

    if new_head == -1 or new_tail == -1 or value[new_head] > hi or value[new_tail] < lo:
        print("0 -1 -1")
        return

    prv[new_head] = -1
    nxt[new_tail] = -1

    forward = []
    cur = new_head
    while cur != -1:
        forward.append(cur)
        if cur == new_tail:
            break
        cur = nxt[cur]

    if not forward or forward[-1] != new_tail:
        print("0 -1 -1")
        return

    backward = []
    cur = new_tail
    while cur != -1:
        backward.append(cur)
        if cur == new_head:
            break
        cur = prv[cur]

    m = len(forward)
    vals = [str(value[i]) for i in forward]

    out = [
        f"{m} {new_head} {new_tail}",
        " ".join(map(str, forward)),
        " ".join(map(str, backward)),
        " ".join(vals)
    ]
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()