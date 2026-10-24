import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    T = int(data[idx]); x = int(data[idx + 1]); idx += 2
    progs = []
    for _ in range(T):
        k = int(data[idx]); idx += 1
        progs.append(data[idx:idx + k])
        idx += k
    m = int(data[idx]); idx += 1
    schedule = list(map(int, data[idx:idx + m]))

    pc = [0] * T
    reg = [0] * T
    load_step = [-1] * T
    last_store_of_thread = [-1] * T
    stale_cnt = 0
    step = 0

    for th in schedule:
        step += 1
        t = th - 1
        instr = progs[t][pc[t]]
        pc[t] += 1
        if instr == 'L':
            reg[t] = x
            load_step[t] = step
        elif instr == 'S':
            stale = any(last_store_of_thread[j] > load_step[t] for j in range(T) if j != t)
            if stale:
                stale_cnt += 1
            x = reg[t]
            last_store_of_thread[t] = step
        else:
            reg[t] += int(instr)

    sys.stdout.write(f"{x}\n{stale_cnt}\n")

if __name__ == "__main__":
    main()