import sys

def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = 0
    n = int(data[it]); it += 1
    head = int(data[it]); it += 1
    tail = int(data[it]); it += 1

    value = []
    prv = []
    nxt = []

    if n > 0:
        value = [0] * n
        prv = [0] * n
        nxt = [0] * n
        for i in range(n):
            value[i] = int(data[it]); it += 1
            prv[i] = int(data[it]); it += 1
            nxt[i] = int(data[it]); it += 1

    m = int(data[it]); it += 1
    xs = [int(data[it + i]) for i in range(m)]

    for x in xs:
        idx = len(value)
        value.append(x)
        prv.append(-1)
        nxt.append(-1)

        if head == -1:  # empty list
            head = tail = idx
            continue

        cur = head
        L = -1
        while cur != -1 and value[cur] <= x:
            L = cur
            cur = nxt[cur]

        if L == -1:
            # insert at head
            nxt[idx] = head
            prv[head] = idx
            head = idx
        else:
            R = nxt[L]
            nxt[L] = idx
            prv[idx] = L
            nxt[idx] = R
            if R != -1:
                prv[R] = idx
            else:
                tail = idx

    # forward traversal
    forward_vals = []
    forward_slots = []
    cur = head
    while cur != -1:
        forward_vals.append(str(value[cur]))
        forward_slots.append(str(cur))
        cur = nxt[cur]

    # backward traversal
    backward_vals = []
    cur = tail
    while cur != -1:
        backward_vals.append(str(value[cur]))
        cur = prv[cur]

    out = sys.stdout
    out.write(' '.join(forward_vals) + '\n')
    out.write(' '.join(backward_vals) + '\n')
    out.write(' '.join(forward_slots) + '\n')

if __name__ == "__main__":
    solve()