import json
import re

with open('data/exams/2022.json', 'r') as f:
    text = f.read()

# Revert previous image fix
text = re.sub(r'<img src="/images/2022-fraction-2-2\.png"[^>]*>', '2/2', text)
text = text.replace('½', '1/2')

def fraction_replacer(match):
    num = match.group(1)
    den = match.group(2)
    return f'<span class="fraction"><span class="numerator">{num}</span><span class="denominator">{den}</span></span>'

new_text = re.sub(r'\b(\d+)/(\d+)\b', fraction_replacer, text)

with open('data/exams/2022.json', 'w') as f:
    f.write(new_text)

print("Replaced fractions.")
