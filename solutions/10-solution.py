import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    events = [(data[1 + 3 * i], data[2 + 3 * i], data[3 + 3 * i]) for i in range(n)]
    lock_state = {}
    for idx, (op, thread, mutex) in enumerate(events, start=1):
        if op == "LOCK":
            if mutex in lock_state:
                holder = lock_state[mutex]
                if holder == thread:
                    print(f"VIOLATION {idx} REENTER")
                else:
                    print(f"VIOLATION {idx} DOUBLE")
                return
            else:
                lock_state[mutex] = thread
        else:  # UNLOCK
            if mutex not in lock_state:
                print(f"VIOLATION {idx} UNHELD")
                return
            holder = lock_state[mutex]
            if holder != thread:
                print(f"VIOLATION {idx} FOREIGN")
                return
            else:
                del lock_state[mutex]
    # No violations
    print("OK")
    held = sorted(lock_state.items())
    print(len(held))
    for m, t in held:
        print(f"{m} {t}")

if __name__ == "__main__":
    main()