import sys

def solve():
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

    # find middle (second middle for even length)
    slow = head
    fast = head
    while fast != -1 and nxt[fast] != -1:
        slow = nxt[slow]
        fast = nxt[nxt[fast]]
    mid = slow

    # reverse from mid to end
    prev = -1
    cur = mid
    while cur != -1:
        nxt_cur = nxt[cur]
        nxt[cur] = prev
        prev = cur
        cur = nxt_cur
    rev_head = prev  # new head of reversed second half

    # compare halves
    p1 = head
    p2 = rev_head
    is_pal = True
    while p2 != -1:
        if value[p1] != value[p2]:
            is_pal = False
            break
        p1 = nxt[p1]
        p2 = nxt[p2]

    sys.stdout.write(("YES\n" if is_pal else "NO\n") + str(value[mid]))

if __name__ == "__main__":
    solve()