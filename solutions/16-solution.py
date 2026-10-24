import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    out = []
    if data[0] == "GEN":
        q = int(data[1])
        seed = int(data[2])
        x = seed
        MOD = 1 << 31
        val_stack = []
        min_stack = []
        for _ in range(q):
            x = (x * 1103515245 + 12345) % MOD
            op = x % 16
            if op <= 9:  # PUSH
                v = ((x // 256) % 100000)
                val_stack.append(v)
                if min_stack:
                    cur_min = min_stack[-1]
                    min_stack.append(v if v < cur_min else cur_min)
                else:
                    min_stack.append(v)
            elif op <= 11:  # POP
                if not val_stack:
                    out.append("EMPTY")
                else:
                    val_stack.pop()
                    min_stack.pop()
            elif op <= 13:  # MIN
                if not min_stack:
                    out.append("EMPTY")
                else:
                    out.append(str(min_stack[-1]))
            else:  # TOP
                if not val_stack:
                    out.append("EMPTY")
                else:
                    out.append(str(val_stack[-1]))
    else:
        q = int(data[0])
        idx = 1
        val_stack = []
        min_stack = []
        for _ in range(q):
            op = data[idx]
            idx += 1
            if op == "PUSH":
                v = int(data[idx])
                idx += 1
                val_stack.append(v)
                if min_stack:
                    cur_min = min_stack[-1]
                    min_stack.append(v if v < cur_min else cur_min)
                else:
                    min_stack.append(v)
            elif op == "POP":
                if not val_stack:
                    out.append("EMPTY")
                else:
                    val_stack.pop()
                    min_stack.pop()
            elif op == "MIN":
                if not min_stack:
                    out.append("EMPTY")
                else:
                    out.append(str(min_stack[-1]))
            elif op == "TOP":
                if not val_stack:
                    out.append("EMPTY")
                else:
                    out.append(str(val_stack[-1]))
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()