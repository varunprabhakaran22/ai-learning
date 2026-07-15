# import matplotlib.pyplot as plt

# import pandas as pd

# ages = [25, 30, 35, 40, 45]
# salaries = [40000, 55000, 62000, 70000, 75000]

# plt.scatter(ages, salaries)
# plt.xlabel("Age")
# plt.ylabel("Salary")
# plt.title("Age vs Salary")
# plt.show()



# df = pd.DataFrame({"age": [25, 30, 35, 40], "salary": [40000, 55000, 62000, 70000]})
# plt.scatter(df["age"], df["salary"])
# plt.show()


# import matplotlib.pyplot as plt
# import pandas as pd
# import seaborn as sns

# df = pd.DataFrame({
#     "age": [25, 30, 35, 40, 45, 28, 33],
#     "salary": [40000, 55000, 62000, 70000, 85000, 48000, 58000],
#     "department": ["Eng", "Eng", "Sales", "Sales", "Eng", "Sales", "Eng"],
# })

# # sns.scatterplot(data=df, x="age", y="salary", hue="department")
# # sns.histplot(data=df, x="salary
# # sns.boxplot(data=df, x="department", y="salary")
# sns.heatmap(df.corr(numeric_only=True))   
# plt.show()


# import pandas as pd

# ages = pd.Series([25, 30, 45], index=["Varun", "Priya", "Raj"])   # labeled 1D
# ages["Varun"]  


# data = {
#     "name": ["Varun", "Priya", "Raj"],
#     "age": [30, 25, 45],
#     "salary": [70000, 62000, 85000],
# }
# df = pd.DataFrame(data)

# print(df)

# print("--------------------")

# print(df["name"])
# print(df.iloc[2])

import asyncio

async def fetch_data():
    print("start")
    await asyncio.sleep(3)
    print("end")
    return "data"

fetch_data()


# asyncio.run(fetch_data())
