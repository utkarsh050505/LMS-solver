import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    cap = int(data[0])
    q = int(data[1])
    out = []
    stack = []
    i = 2
    while i < len(data):
        op = data[i]
        i += 1
        if op == "PUSH":
            x = data[i]
            i += 1
            if len(stack) >= cap:
                out.append("FULL")
            else:
                stack.append(x)
        elif op == "POP":
            if stack:
                out.append(stack.pop())
            else:
                out.append("EMPTY")
        elif op == "TOP":
            if stack:
                out.append(stack[-1])
            else:
                out.append("EMPTY")
        elif op == "SIZE":
            out.append(str(len(stack)))
    sys.stdout.write("\n".join(out))

if __name__ == "__main__":
    main()