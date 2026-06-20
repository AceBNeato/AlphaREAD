import json
import re

filepath = 'src/app/data/blends.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I will just do string replacement on the exact block.
old_block = """      {
        "name": "Digraph",
        "pattern": "th",
        "words": [
          {
            "word": "these",
            "highlights": [
              0,
              1
            ]
          },
          {
            "word": "those",
            "highlights": [
              0,
              1
            ]
          },
          {
            "word": "theme",
            "highlights": [
              0,
              1
            ]
          }
        ]
      },"""

new_block = """      {
        "name": "Digraph",
        "pattern": "th(d)",
        "words": [
          {
            "word": "these",
            "highlights": [
              0,
              1
            ]
          },
          {
            "word": "this",
            "highlights": [
              0,
              1
            ]
          },
          {
            "word": "those",
            "highlights": [
              0,
              1
            ]
          }
        ]
      },
      {
        "name": "Digraph",
        "pattern": "th(t)",
        "words": [
          {
            "word": "theme",
            "highlights": [
              0,
              1
            ]
          },
          {
            "word": "thief",
            "highlights": [
              0,
              1
            ]
          },
          {
            "word": "third",
            "highlights": [
              0,
              1
            ]
          }
        ]
      },"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully.")
else:
    print("Block not found!")
