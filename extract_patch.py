import os
import re

with open('starter.patch', 'r') as f:
    lines = f.readlines()

current_file = None
lines_to_write = []

def save_current_file():
    if current_file and lines_to_write:
        dirname = os.path.dirname(current_file)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
        with open(current_file, 'w') as out:
            out.writelines(lines_to_write)

for line in lines:
    if line.startswith('diff --git '):
        save_current_file()
        current_file = None
        lines_to_write = []
    elif line.startswith('+++ b/'):
        current_file = line[6:].strip()
    elif line.startswith('+') and not line.startswith('+++ '):
        lines_to_write.append(line[1:])
    elif line.startswith(' '):
        lines_to_write.append(line[1:])
    elif line == '\n':
        lines_to_write.append('\n')

save_current_file()
