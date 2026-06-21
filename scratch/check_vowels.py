import re
with open('src/app/data/levels.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    pat_match = re.search(r'"pattern": "([^"]+)"', line)
    if pat_match:
        print(f"  - {pat_match.group(1)}")
