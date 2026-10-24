import json, sys

def generate_parentheses(payload):
    n = payload.get("n", 0)
    if n < 0:
        return []
    if n == 0:
        return [""]
    res = []
    def backtrack(cur, open_cnt, close_cnt):
        if len(cur) == 2 * n:
            res.append(cur)
            return
        if open_cnt < n:
            backtrack(cur + '(', open_cnt + 1, close_cnt)
        if close_cnt < open_cnt:
            backtrack(cur + ')', open_cnt, close_cnt + 1)
    backtrack("", 0, 0)
    return res

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read() or "{}")
    print(json.dumps(generate_parentheses(payload), separators=(",", ":")))