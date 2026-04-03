import fitz
import json
import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(dotenv_path="/Users/rajsrivastava/Desktop/Code Projects/Production - Buzz Scout Pro/.env")
client = OpenAI()

PDFS = {
    2018: "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2018-staar-3-math-rationale.pdf",
    2019: "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2019-staar-3-math-rationales.pdf",
    2021: "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/staar-2021-grade-3-math-rationales.pdf",
    2022: "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2022-staar-3-math-rationale.pdf",
    2023: "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2023-staar-3-math-rationale.pdf",
    2024: "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2024-staar-3-math-rationale.pdf",
    2025: "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2025-staar-math-3-rationale.pdf",
}

def extract_for_items(full_text, year, items):
    prompt = f"""
You are a highly precise legal/academic OCR compliance agent. 
I am providing the text from the STAAR Math Grade 3 Rationale PDF for {year}.
Your job is to extract the EXACT verbatim rationales for the following Item Numbers: {items}.

CRITICAL RULES:
1. absolutely DO NOT summarize. You must copy paragraphs exactly line-by-line. Include ALL sentences.
2. The raw PDF text has broken math fractions due to vertical layouts. Whenever you encounter a math fraction, you MUST rebuild it using this HTML format: <span class='fraction'><span class='numerator'>X</span><span class='denominator'>Y</span></span>. Do not use standard slash fractions.
3. Replace symbols like ×, ÷, <, > exactly as they appear.

Return output in pure JSON mapping itemNumber to its rationale object. Example format:
{{
  "questions": [
    {{
      "itemNumber": 1,
      "rationale": {{
         "correctExplanation": "...",
         "incorrectOptionExplanations": {{"A": "...", "B": "...", "C": "...", "D": "..."}}
      }}
    }}
  ]
}}
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": full_text}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"GPT Error for {year}: {e}")
        return {"questions": []}

for year, path in PDFS.items():
    if not os.path.exists(path):
        print(f"Skipping {year}, missing PDF: {path}")
        continue
        
    exam_json_path = f"/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/math-staar-ishaan/data/exams/{year}.json"
    if not os.path.exists(exam_json_path):
        print(f"Skipping {year}, missing JSON: {exam_json_path}")
        continue
        
    print(f"=== Starting Year {year} ===")
    
    with open(exam_json_path, 'r') as f:
        exam_data = json.load(f)
        
    doc = fitz.open(path)
    full_text = ""
    for page in doc:
        full_text += page.get_text("text") + "\n\n"
    
    # We batch requests in two halves (1-17, 18-35) to prevent GPT token cutoffs
    batches = [list(range(1, 18)), list(range(18, 36))]
    updates = {}
    
    for batch in batches:
        print(f"Requesting items {batch[0]} to {batch[-1]}...")
        result = extract_for_items(full_text, year, batch)
        for q in result.get('questions', []):
            item_num = int(q.get('itemNumber'))
            updates[item_num] = q.get('rationale')
            print(f"  Got rationale for item {item_num}")
            
    # Apply updates
    updated_count = 0
    for q in exam_data.get('questions', []):
        itm = q.get('itemNumber')
        if itm in updates and updates[itm]:
            q['rationale'] = updates[itm]
            updated_count += 1
            
    with open(exam_json_path, 'w') as f:
        json.dump(exam_data, f, indent=2)
        
    print(f"Successfully updated {updated_count} questions for {year}.")
    time.sleep(2) # rate limit buffer

print("All parsing complete!")
