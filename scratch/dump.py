import json
import re

with open('src/app/data/levels.ts', 'r', encoding='utf-8') as f:
    data = f.read()

match = re.search(r'export const LONG_VOWELS_DATA: LongVowelVowelData\[\] = (\[.*?\]);', data, re.DOTALL)
if match:
    # Need to clean the JS object to valid JSON
    json_str = match.group(1)
    json_str = re.sub(r'(\w+):', r'"\1":', json_str)
    try:
        obj = json.loads(json_str)
        list_patterns = []
        for d in obj:
            for p in d['patterns']:
                list_patterns.append(p['pattern'])
        print(list_patterns[:6])
    except Exception as e:
        print(e)
else:
    print("No match")
