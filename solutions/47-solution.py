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
    k = int(data[p])

    # add dummy node at index n
    dummy = n
    value.append(0)          # dummy value unused
    nxt.append(head)         # dummy next points to current head

    # lead pointer k steps ahead
    lead = head
    for _ in range(k):
        lead = -1 if lead == -1 else nxt[lead]

    trail = dummy
    while lead != -1:
        lead = -1 if lead == -1 else nxt[lead]
        trail = nxt[trail]

    del_node = nxt[trail]
    sys.stdout.write(f"{del_node} {value[del_node]}\n")
    # unlink the node
    nxt[trail] = -1 if del_node == -1 else nxt[del_node]

    new_head = nxt[dummy]
    if new_head == -1:
        sys.stdout.write("EMPTY")
    else:
        res = []
        cur = new_head
        while cur != -1:
            res.append(str(value[cur]))
            cur = nxt[cur]
        sys.stdout.write(' '.join(res))

if __name__ == "__main__":
    main()