import json
import re

with open('src/app/data/levels.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Just extract all patterns
matches = re.findall(r'"pattern": "([^"]+)"', content)
print("Found patterns:", matches)
print("Total count:", len(matches))
