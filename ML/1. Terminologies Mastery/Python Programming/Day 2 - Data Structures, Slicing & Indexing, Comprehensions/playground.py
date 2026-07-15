# Day 2 playground — Data Structures, Slicing & Indexing, Comprehensions
# Write your own code under each task, then run:  python3 playground.py
# Tip: PREDICT the output in your head (or in a comment) before running each
# task — that's what actually builds the mental model, not just seeing it run.


# ============================================================
# LIST
# ============================================================

# Task 1
# Create a list of 5 fruit names. Print the whole list, then print its length
# using len().
# list_of_fruits = ["Apple", "orange", "Grapes", "kiwi", "Guava"]
# print(len(list_of_fruits))



# Task 2
# Using the SAME list from Task 1:
#   - append one more fruit to the end
#   - insert a fruit at index 0 (the front)
#   - remove one fruit by VALUE (not by index)
#   - pop the last item off and print what got popped
# Print the list after each step so you can see it change.

# list_of_fruits.append("watermelon")
# print(list_of_fruits)
# list_of_fruits[0] = "fig"
# print(list_of_fruits)
# #   - remove one fruit by VALUE (not by index)
# list_of_fruits.remove("fig")
# print(list_of_fruits)
# print(list_of_fruits.pop(3))
# print(list_of_fruits)



# Task 3 (the reference trap)
# a = [1, 2, 3]
# b = a                (NOT a copy — same list object)
# c = a.copy()          (a REAL copy)
# Append 99 to b. Print a, b, and c.
# Predict which ones show 99 BEFORE running it, then check.

# a = [1, 2, 3]
# b = a               
# c = a.copy()    
# b.append(99)

# print(a,b,c)



# Task 4
# Fix Task 3: this time do b = a.copy() (or a[:]) instead of b = a.
# Append 99 to b again. Print a and b.
# Confirm a is now UNCHANGED — write a one-line comment explaining why.


# a = [1, 2, 3]
# c = a.copy()    
# c.append(99)

# print(a,c)


# ============================================================
# TUPLE
# ============================================================

# Task 5
# Create a tuple with 3 coordinates, e.g. point = (12.9, 77.6, 500).
# Print point[0] and point[-1].
# Then try point[0] = 0 and observe the exact error Python raises.

tuple_example= ("12.0", 'Varun', "home")
print(tuple_example[0], tuple_example[-1])

# Task 6
# Create a dict where the KEY is a tuple, e.g. {(12.9, 77.6): "Bangalore"}.
# Print a lookup using that tuple key.
# Then try to do the same thing with a LIST as the key instead — e.g.
# {[12.9, 77.6]: "Bangalore"} — and observe the exact error.
# Write a one-line comment: why does tuple work as a key but list doesn't?
location_lat = ("120304.90", "19494.89")
location_lon = ("34104.90", "674.89")

dict_example = {location_lat: 'Varun home' , }
dict_example2 = {location_lon: 'Varun Office' , }

print(dict_example, dict_example2)

# location_lat_list = ["120304.90", "19494.89"]
# location_lon_list = ["34104.90", "674.89"]

# dict_example_list = {location_lat_list: 'Varun home' , }
# dict_example_list2 = {location_lon_list: 'Varun Office' , }

# print(dict_example_list, dict_example_list2)





# ============================================================
# INDEXING & SLICING
# ============================================================

# Task 7
# Given: numbers = [10, 20, 30, 40, 50, 60, 70, 80]
# Without running it yet, PREDICT each of these as a comment, THEN run and check:
#   numbers[2] -> 30
#   numbers[-1] -> 80
#   numbers[2:5] -> 30,40, 50
#   numbers[:3] -> 10,20,30,
#   numbers[5:] -> 60,70,80
#   numbers[::2] -> 10, 30, 50,70
#   numbers[1::2] -> 20,40, 60,80
#   numbers[::-1] -> 80,70,60.....10
#   numbers[-3:] -> 60,70,80
numbers = [10, 20, 30, 40, 50, 60, 70, 80]


# Task 8
# Same numbers list. Use slicing (no loops, no if-statements) to produce:
#   - just the last 2 items
#   - every 3rd item starting from index 0
#   - the list reversed, but only the first 4 items of the reversed result
# (There's more than one valid way to write the third one — that's fine.)

# print(numbers[-2:])
# print(numbers[::3])
# reversed_numbers = numbers[::-1]
# print(reversed_numbers[:4])

# Task 9 (strings slice too)
# name = "varun prabhakaran"
# Using slicing only:
#   - print just "varun"
#   - print the string reversed
#   - print every other character
# Then try name[0] = "V" and observe the error — write a one-line comment
# on WHY strings behave like tuples here.
# name = "varun prabhakaran"
# print(name[:4])
# print(name[::-1])
# print(name[::2])

# # name[0]="

# print(name)
# ============================================================
# DICT
# ============================================================

# Task 10
# Create a dict describing yourself: at least name, age, city, and one key
# that does NOT exist yet, e.g. "email" (don't add it).
# Print person["name"] (should work).
# Print person.get("email") (should print None, no crash).
# Print person.get("email", "not provided") (should print your default).
# Then try person["email"] directly and observe the KeyError.

personal_details = {"name":"Varun", "age": "30", "city":"Cbe"}
# print(personal_details["name"])
# print(personal_details.get("email"))
# print(personal_details.get("email", "Not provided"))
personal_details["email"] = "Varun@wowWhatAMan.com"

# print(personal_details)
# print(personal_details.get("email", "Not provided"))
# del personal_details["city"]
print(personal_details)


# Task 11
# Using the SAME dict from Task 10:
# Loop over it TWO ways and print "key: value" for each pair:
#   (a) the classic way — loop over person.keys() and index in with person[key]
#   (b) the idiomatic way — loop over person.items() with key, value unpacking
# Confirm both print the exact same output.

# for key in personal_details.keys():
#   print(f"{key}: {personal_details[key]}")

# for key, value in personal_details.items():
#   print(f"{key}: {value}")

# ============================================================
# SET
# ============================================================

# Task 12
# Create a set from this list (which has duplicates):
# tags = ["python", "ml", "python", "ai", "ml", "ai", "nlp"]
# # Print the resulting set and confirm duplicates are gone.
# # Then try creating an EMPTY set two ways: x = {} and y = set().
# # Print type(x) and type(y) — they will NOT match. Write a one-line comment
# becuase dict came first so empty treated as dict and not set
# # explaining why {} alone doesn't give you an empty set.
# same answe as above right

# print(set(tags))
# x= {}
# y=set()
# print(type(x), type(y))


# Task 13
# a = {1, 2, 3, 4}
# b = {3, 4, 5, 6}
# Predict, then print:
#   a & b   (intersection)
#   a | b   (union)
#   a - b   (difference: in a, not in b)
#   b - a   (difference the OTHER way — is it the same as a - b? predict first)


# ============================================================
# COMPREHENSIONS
# ============================================================

# Task 14
# Write a plain for-loop that builds a list of cubes (n ** 3) for n in
# range(6). Then write the SAME thing again as a one-line list comprehension.
# Confirm both print identical results.

# for n in range(6):
#   print(n**3)

# cubes = [n**3 for n in range(6)]
# print(cubes)



# Task 15
# Using a list comprehension (no plain loop this time):
# Given: words = ["cat", "elephant", "dog", "hippopotamus", "ant"]
# Build a list containing only the words with MORE than 3 letters.
words = ["cat", "elephant", "dog", "hippopotamus", "ant"]
# wordsMoreThanThreeChar = [n for n in words if len(n)> 3]
# print(wordsMoreThanThreeChar)


# Task 16
# # Using a list comprehension:
# # Given the same `words` list, build a list of the UPPERCASE version of each
# # word, but only for words with 3 or fewer letters (combine transform + filter
# # in one comprehension).

# uppercaseWordsMoreThanThreeChar = [n.upper() for n in words if len(n)> 3]
# print(uppercaseWordsMoreThanThreeChar)



# # Task 17 (dict comprehension)
# # Using the same `words` list, build a dict mapping each word to its length,
# # e.g. {"cat": 3, "elephant": 8, ...} — using a dict comprehension, not a loop.

# dictMapping = {len(n): n for n in words}
# print(dictMapping)



# Task 18 (set comprehension)
# Using the same `words` list, build a SET of the first letter of each word
# using a set comprehension. Since it's a set, duplicate first letters should
# collapse — pick/add a couple of words that share a first letter to prove it.

# words_with_shared_letters = words + ["cherry", "elk"]  # 'c' shared w/ cat, 'e' shared w/ elephant
# print(words_with_shared_letters)
# first_letters = {n[0] for n in words_with_shared_letters}
# print(first_letters)


# Task 18b (any / all — Theory.md ⑦)
# Using the same `words` list:
#   - use any(...) to check if AT LEAST ONE word has more than 10 letters
#   - use all(...) to check if EVERY word has at least 3 letters
#   - use any(...) to check if any word starts with "z"
# Write each as a generator expression passed directly into any()/all(),
# e.g. any(CONDITION for word in words) — no square brackets.

has_long_word = all(len(n)> 10 for n in words)
print(has_long_word)

# Task 19 (when NOT to use a comprehension — judgment call)
# Write a plain for-loop (not a comprehension) that, for each word in `words`,
# prints a different message depending on word length:
#   short (<=3): print(f"{word} is short")
#   medium (4-7): print(f"{word} is medium")
#   long (8+): print(f"{word} is long")
# After writing it, add a one-line comment: why would cramming this into a
# single comprehension be a bad idea here?

for word in words:
    length = len(word)
    if length <= 3:
        print(f"{word} is short")
    elif length <= 7:
        print(f"{word} is medium")
    else:
        print(f"{word} is long")
# A comprehension's expression slot holds ONE expression — three separate
# branches with three different print() calls (a side effect, not a value
# to collect into a list) can't be expressed that way. Forcing it into one
# line would need nested ternaries with no real list being built, which is
# harder to read than this plain loop, not easier.


counter = 0
def increment():
    counter += 1

increment()
increment()
print(counter)     # 2
