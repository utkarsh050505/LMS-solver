import json, sys
from collections import Counter

def min_anagram_replacements(payload):
    s = payload.get("s", "")
    t = payload.get("t", "")
    cs = Counter(s)
    ct = Counter(t)
    replacements = 0
    for ch, cnt in cs.items():
        deficit = cnt - ct.get(ch, 0)
        if deficit > 0:
            replacements += deficit
    return replacements

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read() or "{}")
    print(json.dumps(min_anagram_replacements(payload), separators=(",", ":")))