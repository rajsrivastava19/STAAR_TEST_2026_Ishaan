import fitz

def dump_first_page(path):
    try:
        doc = fitz.open(path)
        print(f"--- {path} ---")
        print(doc[0].get_text("text")[:1000])
        doc.close()
    except Exception as e:
        print(f"Error reading {path}: {e}")

dump_first_page('/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2023-staar-3-math-rationale.pdf')
dump_first_page('/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/Previous Exam Files/2018-staar-3-math-rationale.pdf')
