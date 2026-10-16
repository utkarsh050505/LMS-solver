import sys

def solve():
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    n = int(next(it))
    head = int(next(it))
    tail = int(next(it))
    value = [0] * n
    prv = [0] * n
    nxt = [0] * n
    for i in range(n):
        value[i] = int(next(it))
        prv[i] = int(next(it))
        nxt[i] = int(next(it))
    q = int(next(it))
    total = 0
    for _ in range(q):
        x = int(next(it))
        c = int(next(it))
        pos = 1
        cur = head
        found = -1
        while cur != -1:
            if value[cur] == x:
                found = cur
                break
            cur = nxt[cur]
            pos += 1
        if found == -1:
            total += c * n
            continue
        total += c * pos
        if found != head:
            p = prv[found]
            nx = nxt[found]
            # unlink found
            if p != -1:
                nxt[p] = nx
            if nx != -1:
                prv[nx] = p
            else:
                tail = p
            # insert at front
            prv[found] = -1
            nxt[found] = head
            prv[head] = found
            head = found
    # build forward order
    forward = []
    cur = head
    while cur != -1:
        forward.append(cur)
        cur = nxt[cur]
    # build backward order from tail
    backward = []
    cur = tail
    while cur != -1:
        backward.append(cur)
        cur = prv[cur]
    out_lines = []
    out_lines.append(str(total))
    out_lines.append(' '.join(map(str, forward)))
    out_lines.append(' '.join(str(value[i]) for i in forward))
    out_lines.append(' '.join(map(str, backward)))
    sys.stdout.write('\n'.join(out_lines))

if __name__ == "__main__":
    solve()