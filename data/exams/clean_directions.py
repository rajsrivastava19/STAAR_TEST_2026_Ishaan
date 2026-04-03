import sys
content = open(sys.argv[1]).read()
target_line = '      "directions": "Read each question carefully. For a multiple-choice question, determine the best answer to the question from the four answer choices provided. For a griddable question, determine the best answer to the question. Then fill in the answer on your answer document.",\n'
new_content = content.replace(target_line, '')
open(sys.argv[1], 'w').write(new_content)
