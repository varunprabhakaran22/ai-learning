# Day 2 showcase — one small script exercising every rule from Theory.md.
# Run this yourself:  python3 example.py

# --- Theory.md ①: list — mutable, ordered, and the reference-assignment trap ---
fruits = ["apple", "banana", "cherry"]
fruits.append("date")
print("fruits:", fruits)

a = [1, 2, 3]
b = a              # SAME object as a, not a copy
c = a.copy()       # a REAL copy
b.append(99)
print("a:", a, "| b:", b, "| c:", c)

# --- Theory.md ②: tuple — like list but immutable, and hashable ---
point = (12.9, 77.6)
print("point[0]:", point[0], "| point[-1]:", point[-1])

try:
    point[0] = 0
except TypeError as e:
    print("Got the expected error:", e)

locations = {(12.9, 77.6): "Bangalore"}  # tuple works as a dict key
print("locations:", locations)

# --- Theory.md ③: indexing & slicing — negative index, half-open ranges, step ---
numbers = [10, 20, 30, 40, 50, 60, 70, 80]
print("numbers[2]:", numbers[2], "| numbers[-1]:", numbers[-1])
print("numbers[2:5]:", numbers[2:5])
print("numbers[::2]:", numbers[::2])
print("numbers[::-1]:", numbers[::-1])

name = "varun prabhakaran"
print("name[:5]:", name[:5])
print("name[::-1]:", name[::-1])

# --- Theory.md ④: dict — bracket access vs .get(), .items() unpacking ---
person = {"name": "Varun", "age": 30, "city": "Bangalore"}
print("person['name']:", person["name"])
print("person.get('email'):", person.get("email"))
print("person.get('email', 'not provided'):", person.get("email", "not provided"))

try:
    print(person["email"])
except KeyError as e:
    print("Got the expected error:", e)

for key, value in person.items():
    print(f"{key}: {value}")

# --- Theory.md ⑤: set — no duplicates, membership, set math ---
tags = {"python", "ml", "python", "ai", "ml"}
print("tags (duplicates dropped):", tags)

s1 = {1, 2, 3}
s2 = {2, 3, 4}
print("intersection:", s1 & s2, "| union:", s1 | s2, "| difference:", s1 - s2)

# --- Theory.md ⑥: comprehensions — loop vs list/dict/set comprehension ---
squares_loop = []
for n in range(5):
    squares_loop.append(n ** 2)

squares_comprehension = [n ** 2 for n in range(5)]
print("squares_loop == squares_comprehension:", squares_loop == squares_comprehension)

evens_squared = [n ** 2 for n in range(10) if n % 2 == 0]
print("evens_squared:", evens_squared)

squares_map = {n: n ** 2 for n in range(5)}
print("squares_map:", squares_map)

words = ["cat", "elephant", "dog", "hippopotamus", "ant"]
unique_lengths = {len(word) for word in words}
print("unique_lengths:", unique_lengths)
