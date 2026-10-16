import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    pos = int(data[1]) if len(data) > 1 else -1
    # No need to process node values
    sys.stdout.write("true" if pos >= 0 else "false")

if __name__ == "__main__":
    solve()