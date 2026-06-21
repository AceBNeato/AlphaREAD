import re
with open('src/app/data/blends.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_cat = ""
patterns = []

for line in lines:
    cat_match = re.search(r'"name": "(.*Blends?|Digraphs)"', line)
    if cat_match:
        current_cat = cat_match.group(1)
        print(f"\nCategory: {current_cat}")
    
    pat_match = re.search(r'"pattern": "([^"]+)"', line)
    if pat_match:
        print(f"  - {pat_match.group(1)}")
