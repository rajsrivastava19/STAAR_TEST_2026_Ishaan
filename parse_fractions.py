import json
import glob
import re

def replace_fractions_in_text(text):
    if not isinstance(text, str):
        return text
    # Replace unicode fractions
    text = text.replace('½', '1/2').replace('¼', '1/4').replace('¾', '3/4')
    # Replace n/d
    def fraction_replacer(match):
        num = match.group(1)
        den = match.group(2)
        return f"<span class='fraction'><span class='numerator'>{num}</span><span class='denominator'>{den}</span></span>"
    return re.sub(r'\b(\d+)/(\d+)\b', fraction_replacer, text)

for filepath in glob.glob('data/exams/*.json'):
    with open(filepath, 'r') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            continue

    for item in data:
        if 'stem' in item:
            item['stem'] = replace_fractions_in_text(item['stem'])
        if 'directions' in item:
            item['directions'] = replace_fractions_in_text(item['directions'])
        
        # Options array (multiple choice, multi-select, drag_drop)
        if 'options' in item and isinstance(item['options'], list):
            for opt in item['options']:
                if 'text' in opt:
                    opt['text'] = replace_fractions_in_text(opt['text'])
        
        # Rationale
        if 'rationale' in item:
            rat = item['rationale']
            if 'correctExplanation' in rat:
                rat['correctExplanation'] = replace_fractions_in_text(rat['correctExplanation'])
            if 'remediationTip' in rat:
                rat['remediationTip'] = replace_fractions_in_text(rat['remediationTip'])
            if 'incorrectOptionExplanations' in rat and isinstance(rat['incorrectOptionExplanations'], dict):
                for key, val in rat['incorrectOptionExplanations'].items():
                    rat['incorrectOptionExplanations'][key] = replace_fractions_in_text(val)

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

print("Fraction formatting applied to all JSON files safely.")
