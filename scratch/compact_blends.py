import re

filepath = 'src/app/data/blends.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The file contains heavily indented JSON-like structures for the words.
# We will compact the word objects.
# Example:
# {
#   "word": "blue",
#   "highlights": [
#     0,
#     1
#   ]
# }

# Regex to find these blocks
# It handles 2 or 3 highlights
pattern = re.compile(r'\{\s*"word":\s*"([^"]+)",\s*"highlights":\s*\[\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\s*\]\s*\}')

def replacer(match):
    word = match.group(1)
    h1 = match.group(2)
    h2 = match.group(3)
    h3 = match.group(4)
    
    if h3:
        return f'{{ word: "{word}", highlights: [{h1}, {h2}, {h3}] }}'
    else:
        return f'{{ word: "{word}", highlights: [{h1}, {h2}] }}'

new_content = pattern.sub(replacer, content)

# Also compact the pattern objects a bit by stripping some newlines if we want,
# but just compacting the word arrays will save 800+ lines.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Compacted blends.ts successfully!")
