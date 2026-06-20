import json
import re
import os

filepath = 'src/app/data/blends.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract JSON
match = re.search(r'export const BLENDS_DATA: BlendCategory\[\] = (\[.*?\])\s*;\s*export const BLENDS_SENTENCES', content, re.DOTALL)
if not match:
    print("Could not find BLENDS_DATA")
    exit(1)

json_str = match.group(1)
try:
    data = json.loads(json_str)
except json.JSONDecodeError as e:
    print("JSON decode error:", e)
    exit(1)

# New words for 2-Letter Blends and Digraphs
new_words_map = {
    "bl": ["blue", "blade", "blame"],
    "br": ["brave", "broke", "bride"],
    "cl": ["clean", "close", "clay"],
    "cr": ["crane", "crew", "cry"],
    "dr": ["drive", "dream", "drone"],
    "fl": ["flame", "flute", "fly"],
    "fr": ["frame", "free", "freeze"],
    "gl": ["globe", "glue", "glide"],
    "gr": ["green", "grape", "grow"],
    "pl": ["play", "plane", "plate"],
    "pr": ["price", "prize", "pride"],
    "sc": ["scale", "score", "scoop"],
    "sk": ["sky", "skate", "ski"],
    "sl": ["sleep", "slide", "slow"],
    "sm": ["smile", "smoke", "smear"],
    "sn": ["snake", "snail", "snow"],
    "sp": ["spoon", "space", "spade"],
    "st": ["stone", "state", "steam"],
    "sw": ["sweet", "sweep", "sway"],
    "tr": ["tree", "train", "trade"],
    "tw": ["twice", "tweet", "twine"],
    
    "ch": ["chair", "cheese", "chase"],
    "sh": ["shoe", "sheep", "shape"],
    "th": ["these", "those", "theme"],
    "wh": ["whale", "white", "wheel"],
    "ph": ["phone", "photo", "phase"]
}

for category in data:
    cat_name = category["name"]
    
    for pattern in category["patterns"]:
        pat_str = pattern["pattern"]
        
        if cat_name in ["2-Letter Blends", "Digraphs"]:
            if pat_str in new_words_map:
                new_words = []
                for w in new_words_map[pat_str]:
                    # Find highlights (the pattern substring)
                    idx = w.find(pat_str)
                    if idx != -1:
                        highlights = list(range(idx, idx + len(pat_str)))
                    else:
                        highlights = [0, 1]
                    new_words.append({"word": w, "highlights": highlights})
                pattern["words"] = new_words
        
        elif cat_name == "Ending Blends":
            # Truncate to 3 examples
            pattern["words"] = pattern["words"][:3]

new_json_str = json.dumps(data, indent=2)

new_content = content[:match.start(1)] + new_json_str + content[match.end(1):]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully rewrote blends.ts")
