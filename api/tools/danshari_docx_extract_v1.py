from zipfile import ZipFile
from pathlib import Path
import re

src_root = Path("/opt/tenmon-ark-data/uploads/scriptures/断捨離データ")
out_root = Path("/opt/tenmon-ark-data/uploads/scriptures/extracted_danshari")
out_root.mkdir(parents=True, exist_ok=True)

count = 0
for docx in sorted(src_root.glob("*.docx")):
    try:
        with ZipFile(docx) as z:
            xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
        parts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml)
        text = "\n".join(parts)
        text = text.replace("&amp;","&").replace("&lt;","<").replace("&gt;",">")
        out = out_root / (docx.stem + ".txt")
        out.write_text(text, encoding="utf-8")
        count += 1
        print(f"OK {docx.name} -> {out.name} chars={len(text)}")
    except Exception as e:
        print(f"FAIL {docx.name}: {e}")

print("TOTAL", count)
