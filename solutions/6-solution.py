import sys

def simulate(M, ops, policy):
    free = [(0, M)]
    allocated = {}
    fails = 0
    for op in ops:
        if op[0] == 'A':
            _, pid, sz = op
            best_idx = -1
            best_len = None
            for i, (s, e) in enumerate(free):
                length = e - s
                if length >= sz:
                    if policy == 'best':
                        if best_len is None or length < best_len or (length == best_len and s < free[best_idx][0]):
                            best_len = length
                            best_idx = i
                    else:  # worst
                        if best_len is None or length > best_len or (length == best_len and s < free[best_idx][0]):
                            best_len = length
                            best_idx = i
            if best_idx == -1:
                fails += 1
            else:
                s, e = free[best_idx]
                allocated[pid] = (s, sz)
                if e - s == sz:
                    del free[best_idx]
                else:
                    free[best_idx] = (s + sz, e)
        else:  # Free
            _, pid = op
            if pid in allocated:
                s, sz = allocated.pop(pid)
                new_interval = (s, s + sz)
                free.append(new_interval)
                free.sort()
                merged = []
                for a, b in free:
                    if not merged or merged[-1][1] < a:
                        merged.append([a, b])
                    else:
                        merged[-1][1] = max(merged[-1][1], b)
                free = [tuple(x) for x in merged]
    total_free = sum(e - s for s, e in free)
    largest = max((e - s for s, e in free), default=0)
    frag = total_free - largest
    return fails, frag

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    M = int(data[0]); q = int(data[1])
    ops = []
    idx = 2
    for _ in range(q):
        if data[idx] == 'A':
            ops.append(('A', data[idx + 1], int(data[idx + 2])))
            idx += 3
        else:
            ops.append(('F', data[idx + 1]))
            idx += 2
    best_fails, best_frag = simulate(M, ops, 'best')
    worst_fails, worst_frag = simulate(M, ops, 'worst')
    print(f'BEST {best_fails} {best_frag}')
    print(f'WORST {worst_fails} {worst_frag}')

if __name__ == "__main__":
    main()