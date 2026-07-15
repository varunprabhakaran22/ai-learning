# Day 1 showcase — one small script exercising every rule from Theory.md.
# Run this yourself:  python3 example.py

# --- Theory.md ⓪: assignment binds a NAME to an object, no let/const/var ---
x = 5
print("x =", x, "| type:", type(x))

x = "hello"  # not overwriting in place — x now points to a NEW string object
print("x =", x, "| type:", type(x))

# --- Theory.md ①: type() tells you the current type of any value ---
name = "Varun"
age = 30
is_learning_python = True
nothing_yet = None

print(type(name), type(age), type(is_learning_python), type(nothing_yet))

# --- Theory.md ②: int vs float, and / vs // ---
a = 5
b = 2.0
print("int a:", a, type(a))
print("float b:", b, type(b))

true_division = 5 / 2   # ALWAYS a float
floor_division = 5 // 2  # rounds down toward negative infinity
print("5 / 2 =", true_division, "| 5 // 2 =", floor_division)
print("-5 // 2 =", -5 // 2)  # -3, not -2 — floors toward negative infinity

mixed = 5 + 2.0  # int + float -> promoted to float
print("5 + 2.0 =", mixed, type(mixed))

# --- Theory.md ③: None is the ONLY "nothing" value (no separate undefined) ---
result = None
print("result before assignment:", result)
result = "done"
print("result after assignment:", result)

# --- Theory.md ④: bool is capitalized; == already compares value AND type ---
is_valid = True
print(5 == 5, 5 == "5", is_valid == True)

# --- Theory.md ⑤: f-strings are Python's template literals ---
greeting = f"Hello, {name}! You are {age} years old."
print(greeting)

# --- Theory.md ⑥: no implicit coercion — must convert explicitly ---
try:
    print("5" + 3)  # this line raises TypeError
except TypeError as e:
    print("Got the expected error:", e)

print("5" + str(3))   # "53" — explicit conversion one way
print(int("5") + 3)   # 8    — explicit conversion the other way
