import json

file_path = 'data/exams/2022.json'
with open(file_path, 'r') as f:
    data = json.load(f)

for q in data['questions']:
    if 'directions' in q:
        del q['directions']

with open(file_path, 'w') as f:
    json.dump(data, f, indent=2)

print("Done")
