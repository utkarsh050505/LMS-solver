import sys

def main():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    freq = {}
    best_sku = None
    best_cnt = -1
    idx = 1
    for _ in range(n):
        sku = int(data[idx])
        idx += 1
        cnt = freq.get(sku, 0) + 1
        freq[sku] = cnt
        if cnt > best_cnt or (cnt == best_cnt and (best_sku is None or sku < best_sku)):
            best_cnt = cnt
            best_sku = sku
    # In case the best was not updated due to later ties, ensure we pick smallest among max counts
    # (the above loop already handles tie-breaking during counting, but if later a different sku reaches same max count,
    # it won't replace because sku may be larger; however if a smaller sku reaches same max later, it should replace.)
    # The condition already handles that.
    sys.stdout.write(str(best_sku))

if __name__ == "__main__":
    main()