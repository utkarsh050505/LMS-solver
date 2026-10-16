import sys

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    total_bits = 0
    power_cnt = 0
    for i in range(1, n + 1):
        v = int(data[i])
        total_bits += v.bit_count()
        if v > 0 and (v & (v - 1)) == 0:
            power_cnt += 1
    sys.stdout.write(f"{total_bits} {power_cnt}")

if __name__ == "__main__":
    main()