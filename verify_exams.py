import os
import json
import re
import fitz

PDF_DIR = "/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files"
JSON_DIR = "data/exams"
OUTPUT_FILE = "verification_report.html"

EXAM_FILES = {
    2018: {"test": "2018-staar-3-math-test.pdf", "rationale": "2018-staar-3-math-rationale.pdf"},
    2019: {"test": "2019-staar-3-math-test.pdf", "rationale": "2019-staar-3-math-rationales.pdf"},
    2021: {"test": "2021-staar-3-math-test-2.pdf", "rationale": "staar-2021-grade-3-math-rationales.pdf"},
    2022: {"test": "2022-staar-3-math-test-2.pdf", "rationale": "2022-staar-3-math-rationale.pdf"},
    2023: {"test": None, "rationale": "2023-staar-3-math-rationale.pdf"},
    2024: {"test": None, "rationale": "2024-staar-3-math-rationale.pdf"},
    2025: {"test": None, "rationale": "2025-staar-math-3-rationale.pdf"},
}

def strip_html(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    # convert nbsp and other entities
    text = text.replace('&nbsp;', ' ').replace('&#9633;', ' ')
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def normalize_text(text):
    return re.sub(r'\s+', ' ', text).strip()

def get_pdf_text(filename):
    if not filename:
        return ""
    path = os.path.join(PDF_DIR, filename)
    if not os.path.exists(path):
        return ""
    try:
        doc = fitz.open(path)
        text = ""
        for page in doc:
            text += page.get_text("text") + " "
        doc.close()
        return normalize_text(text)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return ""

def main():
    report = ["<html><head><title>STAAR Exam Verification Report</title>",
              "<style>body{font-family:sans-serif; padding: 20px;} ",
              ".issue {background: #ffebee; padding: 10px; margin: 5px 0; border-left: 4px solid #f44336;}",
              ".good {background: #e8f5e9; padding: 10px; margin: 5px 0; border-left: 4px solid #4CAF50;}",
              ".manual {background: #fff3e0; padding: 10px; margin: 5px 0; border-left: 4px solid #ff9800;}",
              "</style></head><body><h1>STAAR Exam Read-Only Verification Report</h1>"]

    for year, files in EXAM_FILES.items():
        json_path = os.path.join(JSON_DIR, f"{year}.json")
        if not os.path.exists(json_path):
            continue
        
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        test_text = get_pdf_text(files.get("test"))
        rationale_text = get_pdf_text(files.get("rationale"))

        # Combine text for easier searching, especially since rationales 
        # often repeat bits of the question
        full_text_lower = (test_text + " " + rationale_text).lower()

        report.append(f"<h2>Year: {year}</h2>")
        
        issues = []
        for q in data.get("questions", []):
            qid = q.get("id")
            
            # Stem verification
            stem_clean = strip_html(q.get("stem", ""))
            
            # Substring match (basic)
            stem_found = stem_clean.lower() in full_text_lower
            # Try a partial check (longer than 20 chars) since PDF extraction might have weird missing spaces
            if not stem_found and len(stem_clean) > 20:
                # check first half
                half_stem = stem_clean[:len(stem_clean)//2].lower()
                if half_stem in full_text_lower:
                    stem_found = True

            if not files.get("test"):
                issues.append(f"<div class='manual'><b>{qid} Stem/Options</b>: Manual visual review required (No official Test PDF).</div>")
            elif not stem_found and stem_clean:
                issues.append(f"<div class='issue'><b>{qid} Stem Mismatch</b>: The stem text was not found in the official PDF. Possible hallucination.<br/><i>App Text:</i> {stem_clean}</div>")
            else:
                 pass # Good
            
            # Options verification
            if files.get("test") and "options" in q:
                for opt in q["options"]:
                    opt_html_stripped = strip_html(opt.get("text", ""))
                    if not opt_html_stripped: continue
                    # Only verify text length > 5 to avoid flagging short numbers incorrectly matching randomly
                    if len(opt_html_stripped) > 5 and opt_html_stripped.lower() not in full_text_lower:
                        issues.append(f"<div class='issue'><b>{qid} Option {opt.get('id')} Mismatch</b>: Option text not found.<br/><i>App Text:</i> {opt_html_stripped}</div>")

            # Rationale verification
            correct_rationale = q.get("rationale", {}).get("correctExplanation", "")
            correct_clean = normalize_text(correct_rationale)
            if correct_clean and len(correct_clean) > 20:
                # Check snippet
                snippet = correct_clean[:50].lower()
                if snippet not in rationale_text.lower():
                    issues.append(f"<div class='issue'><b>{qid} Rationale Mismatch</b>: Correct explanation not found in PDF.<br/><i>App snippet:</i> {snippet}</div>")

            # Incorrect Options Explanation Verification
            incorrect_rationales = q.get("rationale", {}).get("incorrectOptionExplanations", {})
            for opt_key, reason in incorrect_rationales.items():
                reason_clean = normalize_text(reason)
                if reason_clean and len(reason_clean) > 20:
                    snippet = reason_clean[:50].lower()
                    if snippet not in rationale_text.lower():
                         issues.append(f"<div class='issue'><b>{qid} Incorrect Rationale {opt_key} Mismatch</b>: Explanation not found in PDF.<br/><i>App snippet:</i> {snippet}</div>")

        if not issues:
            report.append("<div class='good'>All exact string matches verified or flagged for manual review appropriately! (Zero automated critical mismatches)</div>")
        else:
            report.extend(issues)
            
    report.append("</body></html>")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(report))
        
    print(f"Report generated at {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
