import sys

def max_supplies(costs, credits):
    costs.sort()
    count = 0
    total = 0
    for c in costs:
        total += c
        if total > credits:
            break
        count += 1
    return count

data = list(map(int, sys.stdin.read().split()))
if not data:
    sys.exit()
n = data[0]
costs = data[1:1 + n]
credits = data[1 + n] if len(data) > 1 + n else 0
print(max_supplies(costs, credits))