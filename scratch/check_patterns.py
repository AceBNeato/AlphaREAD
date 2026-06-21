import re

with open('src/app/data/levels.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

patterns = []
for line in lines:
    m = re.search(r'"pattern": "([^"]+)"', line)
    if m:
        patterns.append(m.group(1))

print("Total Patterns:", len(patterns))
print("Patterns:", patterns)
