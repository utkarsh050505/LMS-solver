import sys

def main():
    s = sys.stdin.read()
    chars = [c.lower() for c in s if c.isalnum()]
    i, j = 0, len(chars) - 1
    while i < j:
        if chars[i] != chars[j]:
            print("NO")
            return
        i += 1
        j -= 1
    print("YES")

if __name__ == "__main__":
    main()