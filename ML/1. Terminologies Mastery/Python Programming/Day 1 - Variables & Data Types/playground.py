# Day 1 playground — Variables & Data Types
# Write your own code under each task, then run:  python3 playground.py


# Task 1
# Create a variable holding your name (a str) and one holding your age (an int).
# Print both using an f-string in one sentence, e.g. "My name is ... and I am ... years old."

name = 'Varun'
age= 30

print(f"My name is {name} and i'm {age} years old.")



# Task 2
# Create an int variable and a float variable. Use type() to print the type of each.
variable_int = 7
variable_float =  3.14
print(type(variable_int), type(variable_float))


# Task 3
# Compute 7 / 2 and 7 // 2. Print both results and explain in a comment why they differ.

print(7 / 2)
print(6 // 2)


# Task 4
# Create a variable set to None. Print it and its type().
# Then reassign it to any real value and print it again.
example_for_none = None
print(example_for_none, type(example_for_none))
example_for_none = 'Varun'
print(example_for_none, type(example_for_none))

# Task 5
# Try to concatenate a number directly to a string with + (e.g. "Score: " + 42) and
# run it once to SEE the TypeError yourself, then fix it using str().
# print(name + variable_int)
print(name+ str(variable_int))


# Task 6
# Predict, then check: does 5 == "5" print True or False in Python? Write the line and run it.


# Task 7 (scope)
# Assign a variable inside an if-block (no function). Print it OUTSIDE the if-block.
# Confirm for yourself that it's still visible (no block scope in Python).

def example_function():
    x = 10
    print(x)
example_function()
if True:
  x = 20
  y = 20
z=30
print(x, y, z)
