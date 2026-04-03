import re

with open('data/exams/2022.json', 'r') as f:
    text = f.read()

text = text.replace('class="fraction"', "class='fraction'")
text = text.replace('class="numerator"', "class='numerator'")
text = text.replace('class="denominator"', "class='denominator'")

with open('data/exams/2022.json', 'w') as f:
    f.write(text)

print("Fixed JSON.")
