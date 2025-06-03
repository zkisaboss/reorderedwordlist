# pip install python-Levenshtein pybktree
import Levenshtein
from pybktree import BKTree
from collections import defaultdict

# --- load & merge -------------------------------------------------------------
with open('wordlist.txt') as f:
    wordlist = set(w.strip() for w in f if w.strip())
with open('newWords.txt') as f:
    wordlist.update(w.strip() for w in f if w.strip())

# --- bucket by length ---------------------------------------------------------
buckets = defaultdict(list)
for w in wordlist:
    buckets[len(w)].append(w)

# --- helpers ------------------------------------------------------------------
def neighbor_counts_bktree(words):
    tree = BKTree(Levenshtein.distance, words)
    return {w: len(tree.find(w, 1)) - 1 for w in words}

def neighbor_counts_naive(words):
    return {w: sum(Levenshtein.distance(w, o) == 1 for o in words if o != w)
            for w in words}

# --- sort ---------------------------------------------------------------------
THRESHOLD = 2_000          # switch to BK-tree when the bucket is large
final = []

for length in sorted(buckets):
    group = buckets[length]
    if len(group) > THRESHOLD:
        counts = neighbor_counts_bktree(group)
    else:
        counts = neighbor_counts_naive(group)

    group.sort(key=lambda w: -counts[w])     # most neighbors → first
    final.extend(group)

# --- write back ---------------------------------------------------------------
with open('wordlist.txt', 'w') as f:
    f.write('\n'.join(final))
