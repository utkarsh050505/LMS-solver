import sys
from collections import deque

def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    q = int(data[0].strip())
    out = []
    queue = deque()
    names = []
    status = []  # 0 = waiting, 1 = cancelled, 2 = called
    waiting = 0
    next_token = 1
    idx = 1
    for _ in range(q):
        line = data[idx].strip()
        idx += 1
        if not line:
            continue
        parts = line.split()
        cmd = parts[0]
        if cmd == "ARRIVE":
            name = parts[1]
            token = next_token
            next_token += 1
            names.append(name)
            status.append(0)
            queue.append(token)
            waiting += 1
            out.append(str(token))
        elif cmd == "CANCEL":
            t = int(parts[1])
            if 1 <= t <= len(status) and status[t - 1] == 0:
                status[t - 1] = 1
                waiting -= 1
                out.append("OK")
            else:
                out.append("NOT_WAITING")
        elif cmd == "CALL":
            while queue and status[queue[0] - 1] != 0:
                queue.popleft()
            if not queue:
                out.append("EMPTY")
            else:
                token = queue.popleft()
                status[token - 1] = 2
                waiting -= 1
                out.append(f"{token} {names[token - 1]}")
        elif cmd == "WAITING":
            out.append(str(waiting))
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()