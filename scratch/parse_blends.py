import json
import re

text = """
2-Letter Blends
bl	black, blue, blink
br	bread, brown, bring
cl	clap, clock, class
cr	crab, cry, crown
dr	drum, dress, drive
fl	flag, flower, fly
fr	frog, friend, fruit
gl	glass, glove, glow
gr	grass, green, grow
pl	plant, play, plate
pr	pray, prize, print
sc	scare, school, scoop
sk	skate, sky, skip
sl	slide, slow, sleep
sm	smile, small, smoke
sn	snake, snow, snack
sp	spoon, spin, spot
st	star, stop, stone
sw	swim, sweet, swing
tr	tree, train, truck
tw	twin, twelve, twist

Digraphs
ch	chair, cheese 
sh	ship, shoe 
th	thumb, this 
wh	whale, what 
ph	phone, photo 

Three-Letter Blends
str	street, strong, strawberry 
spl	splash, split, splinter 
spr	spring, spray, spread 
scr	scratch, screen, screw 
squ	square, squirrel, squeeze 
shr	shrimp, shrink, shrug

Ending Blends
nd	hand, sand, land, bend, send, blend, kind, wind, mind, pond, bond
nt	plant, grant, paint, tent, sent, bent, front
st	fast, last, past, best, nest, rest, mist, list, twist, lost, most, post
mp	lamp, camp, stamp, temp, jump, limp, shrimp, romp, stomp
sk	task, mask, risk, disk, busk
lt	salt, melt, belt, tilt, quilt
ld	cold, gold, wild, child, held, melt
ft	craft, draft, left, gift, lift, shift
"""

categories = []
current_cat = None

for line in text.strip().split('\n'):
    line = line.strip()
    if not line: continue
    
    if '\t' not in line:
        current_cat = {"name": line, "patterns": []}
        categories.append(current_cat)
    else:
        pattern, words_str = line.split('\t')
        pattern = pattern.strip()
        words = [w.strip() for w in words_str.split(',') if w.strip()]
        
        words_data = []
        for w in words:
            # find pattern in word
            idx = w.find(pattern)
            if idx == -1:
                # for some ending blends, the user typed 'melt' for 'ld' which is wrong, let's just highlight the end 2 chars if not found
                if len(pattern) == 2:
                    idx = len(w) - 2
                else:
                    idx = 0
            
            highlights = list(range(idx, idx + len(pattern)))
            words_data.append({"word": w, "highlights": highlights})
            
        current_cat["patterns"].append({
            "name": current_cat["name"][:-1] if current_cat["name"].endswith("s") else current_cat["name"],
            "pattern": pattern,
            "words": words_data
        })

print(json.dumps(categories, indent=2))
