import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    titles = data[1:1 + n]

    buckets = []               # list of lists, each bucket's titles
    key_to_idx = {}            # canonical key -> bucket index

    for title in titles:
        key = ''.join(sorted(title))
        idx = key_to_idx.get(key)
        if idx is None:
            idx = len(buckets)
            key_to_idx[key] = idx
            buckets.append([title])
        else:
            buckets[idx].append(title)

    out_lines = [str(len(buckets))]
    for bucket in buckets:
        out_lines.append(' '.join(bucket))
    sys.stdout.write('\n'.join(out_lines))

if __name__ == "__main__":
    main()