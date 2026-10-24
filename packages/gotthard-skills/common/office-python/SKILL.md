---
name: office-python
description: Edit or fill Word (.docx) and Excel (.xlsx) files with Python when the built-in tools are not enough, e.g. fill a Word form (Formular / formulaire), write into an existing document or table, convert or analyse files. Use for «Word-Formular ausfüllen», «remplir le formulaire Word», «direkt im Word», «fill the docx».
---

# Office files with Python

Run Python with bash from the workspace: `python - <<'EOF' … EOF`. Available: python-docx (`import docx`), openpyxl, pypdf, pdfplumber, reportlab, lxml.

## Method
1. **Read the source data first** (`read_document` for PDF/Word/Excel). Note every fact you will use; never invent values. Missing information → write «[à compléter]» / «[zu ergänzen]».
2. **Inspect the target file with a script before changing it.** Print its paragraphs and tables and find out how the blanks are built (see below).
3. **Never modify the original.** Load it, change it in memory, save to the results folder (`Resultats/` / `Ergebnisse/`) with a new name, e.g. `rapport_rempli.docx`. If that file exists, use `_v2`.
4. **Verify**: reopen the saved file with a second script and print the filled values next to their labels. For a form, also count the FORMTEXT fields in the original and in the copy: the numbers must be equal and each value must be *inside* a field. Fix and re-save if something is wrong.

## Pitfall: do not destroy form fields
In a form, `run.text = ...`, `paragraph.text = ...` and `cell.text = ...` (python-docx) delete the hidden field codes (`w:fldChar`, `w:instrText`) and turn the form into plain text. Never use them on paragraphs that contain fields. Change only the `w:t` elements between a field's `separate` and `end` markers (snippets below).
5. Report the output path and list any field left empty.

## How Word forms store blanks
- **Legacy form fields** (grey boxes; XML `w:fldChar` with `w:instrText` " FORMTEXT "): the visible value is the text in the runs between the `separate` and the `end` fldChar. Field names (`w:ffData/w:name`) are often duplicated, so identify fields by their order and the label text before them. Fields can be nested (e.g. FILLIN), so track begin/end with a stack.
- **Content controls** (`w:sdt`): the value is the text inside `w:sdtContent`; `w:sdtPr/w:alias` or `w:tag` names the control.
- **Placeholders** like `{{NAME}}` or `[Name]`: replace inside the paragraph; text can be split across several runs, so join the runs' text, replace, and put the result in the first run.
- **Empty table cells or empty paragraphs after a question**: write into the cell or the paragraph directly below the label.

## Snippets

List legacy form fields in order with the text before them:
```python
import docx
from docx.oxml.ns import qn
from lxml import etree

d = docx.Document("form.docx")
stack, fields, before = [], [], ""
for ev, el in etree.iterwalk(d.element.body, events=("start",)):
    if el.tag == qn("w:fldChar"):
        t = el.get(qn("w:fldCharType"))
        if t == "begin":
            stack.append({"instr": "", "sep": False, "texts": []})
        elif t == "separate" and stack:
            stack[-1]["sep"] = True
            if "FORMTEXT" in stack[-1]["instr"]:
                stack[-1]["label"] = before[-80:]
                stack[-1]["run"] = el.getparent()
                fields.append(stack[-1])
        elif t == "end" and stack:
            stack.pop()
    elif el.tag == qn("w:instrText") and stack and not stack[-1]["sep"]:
        stack[-1]["instr"] += el.text or ""
    elif el.tag == qn("w:t"):
        owner = next((s for s in reversed(stack) if s["sep"] and "FORMTEXT" in s["instr"]), None)
        if owner:
            owner["texts"].append(el)
        else:
            before += (el.text or "") + " "
for i, f in enumerate(fields, 1):
    print(i, "|", f["label"].strip())
```

Set a legacy field's value (keeps its formatting):
```python
def set_field(f, value):
    if f["texts"]:
        f["texts"][0].text = value
        for t in f["texts"][1:]:
            t.text = ""
    else:
        r = etree.SubElement(f["run"].getparent(), qn("w:r"))
        f["run"].addnext(r)
        etree.SubElement(r, qn("w:t")).text = value
    for t in f["texts"][:1]:
        t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
```
For multi-line answers, put each line in its own `w:t` separated by `w:br` elements inside the same run.

Excel: `openpyxl.load_workbook(path)` keeps formulas; write values with `ws["B4"] = 123.5`, save under a new name.
