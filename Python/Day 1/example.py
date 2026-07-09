"""Day 1 — Syntax, Variables, Types & the Interpreter Model.

Toy problem: given raw word-count "survey" answers typed as text,
convert them to numbers and compute basic stats. Small, but shaped
like the kind of numeric wrangling NumPy/Pandas will do later.
"""

raw_answers = ["12", "7", "15", "9", "12"]  # pretend these came from input()

# Type conversion is always explicit in Python — never automatic.
counts = [int(answer) for answer in raw_answers]
print("counts:", counts)
print("type of raw_answers[0]:", type(raw_answers[0]))
print("type of counts[0]:", type(counts[0]))

# Same name, different objects over time — dynamic typing, not a typed box.
total = 0
for c in counts:
    total = total + c
print("total:", total)

# Regular division always returns a float in Python 3.
average = total / len(counts)
print("average:", average)

# Floor division vs true division — a common JS-dev trip-up.
print("7 / 2  =", 7 / 2)
print("7 // 2 =", 7 // 2)

# Value equality without coercion: unlike JS's ==, Python never coerces types here.
print("1 == '1' ->", 1 == "1")

# Booleans are capitalized, and/or/not are words, not symbols.
has_enough_answers = len(counts) >= 5
all_positive = all(c > 0 for c in counts)
print("enough answers and all positive:", has_enough_answers and all_positive)

# input()/print() round trip — always returns a str, conversion is on you.
name = input("Your name: ")
print(f"Hello, {name}! You typed a {type(name).__name__}.")
