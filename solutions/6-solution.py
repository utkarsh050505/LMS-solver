import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    tokens = data[1:1 + n]
    stack = []
    for tok in tokens:
        if tok == '+':
            val = stack[-1] + stack[-2]
            stack.append(val)
        elif tok == 'D':
            val = 2 * stack[-1]
            stack.append(val)
        elif tok == 'C':
            stack.pop()
        else:
            stack.append(int(tok))
    total = sum(stack)
    print(len(stack))
    print(total)

if __name__ == "__main__":
    main()