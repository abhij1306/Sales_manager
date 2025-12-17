import streamlit as st
import pandas as pd
import re
from bs4 import BeautifulSoup
import tempfile
from datetime import datetime

# --------------------------------------------------
# Streamlit config
# --------------------------------------------------
st.set_page_config(
    page_title="PO HTML to Excel Extractor",
    layout="centered"
)
st.set_option("client.showErrorDetails", True)

st.title("Purchase Order HTML → Excel Extractor")
st.write("Upload one or more PO HTML files. The app extracts structured data and generates an Excel file.")

# --------------------------------------------------
# Regex
# --------------------------------------------------
RX_LABEL_ONLY = re.compile(r'^[A-Z\s/-]{3,}$')
RX_DRG = re.compile(
    r'DRG(?:[\s\.]*NO[\s\.]*|[\s\.]+)[\:\-]?\s*([A-Z0-9][A-Z0-9\.\-]*)',
    re.IGNORECASE
)

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()

def has_value(text):
    return bool(text and any(c.isalnum() for c in text))

def to_int(val):
    try:
        v = re.sub(r"[^\d]", "", str(val))
        return int(v) if v else None
    except:
        return None

def to_float(val):
    try:
        v = re.sub(r"[^\d.\-]", "", str(val))
        return float(v) if v else None
    except:
        return None

def normalize_date(val):
    if not val:
        return ""

    s = str(val).strip().upper()

    # dd/mm/yyyy or dd-mm-yyyy
    m = re.search(r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})', s)
    if m:
        d, mth, y = m.groups()
        if len(y) == 2:
            y = "20" + y
        return f"{int(d):02d}/{int(mth):02d}/{int(y)}"

    # dd-MMM-yy or dd-MMM-yyyy
    m = re.search(r'(\d{1,2})[\/\-]([A-Z]{3})[\/\-](\d{2,4})', s)
    if m:
        d, mon, y = m.groups()
        if len(y) == 2:
            y = "20" + y
        try:
            dt = datetime.strptime(f"{d}-{mon}-{y}", "%d-%b-%Y")
            return dt.strftime("%d/%m/%Y")
        except:
            return ""

    return ""

# --------------------------------------------------
# Header Extraction
# --------------------------------------------------
def extract_po_header(soup):
    tables = soup.find_all("table")
    header = {}

    def find_value(label_rx, prefer="below"):
        for table in tables:
            rows = table.find_all("tr")
            for r_idx, row in enumerate(rows):
                cells = row.find_all("td")
                for c_idx, cell in enumerate(cells):
                    cell_text = clean(cell.get_text())

                    if not re.search(label_rx, cell_text, re.IGNORECASE):
                        continue

                    inline = re.search(
                        rf"{label_rx}[:\.]?\s*(.+)",
                        cell_text,
                        re.IGNORECASE
                    )
                    if inline and has_value(inline.group(1)):
                        return clean(inline.group(1))

                    if prefer == "adjacent" and c_idx + 1 < len(cells):
                        val = clean(cells[c_idx + 1].get_text())
                        if has_value(val):
                            return val

                    if r_idx + 1 < len(rows):
                        below_cells = rows[r_idx + 1].find_all("td")
                        if c_idx < len(below_cells):
                            val = clean(below_cells[c_idx].get_text())
                            if has_value(val) and not RX_LABEL_ONLY.match(val):
                                return val
        return ""

    # Inline fields
    for k, rx in {
        "TIN NO": r"TIN\s+NO",
        "ECC NO": r"ECC\s+NO",
        "MPCT NO": r"MPCT\s+NO",
        "PHONE": r"PHONE",
        "FAX": r"FAX",
        "EMAIL": r"EMAIL",
        "WEBSITE": r"WEBSITE"
    }.items():
        header[k] = find_value(rx)

    # Below-cell fields
    for k, rx in {
        "PURCHASE ORDER": r"^PURCHASE\s+ORDER$",
        "PO DATE": r"PO\s+DATE",
        "ENQUIRY": r"ENQUIRY",
        "SUPP CODE": r"SUPP\s+CODE",
        "ORD-TYPE": r"ORD-TYPE",
        "DVN": r"DVN",
        "QUOTATION": r"QUOTATION",
        "QUOT-DATE": r"QUOT-DATE",
        "PO STATUS": r"PO\s+STATUS",
        "AMEND NO": r"AMEND\s+NO",
        "PO-VALUE": r"PO-VALUE",
        "RC NO": r"RC\s+NO",
        "EX RATE": r"EX\s+RATE",
        "CURRENCY": r"CURRENCY",
        "FOB VALUE": r"FOB\s+VALUE",
        "NET PO VAL": r"NET\s+PO\s+VAL",
        "ENQ DATE": r"ENQ\s+DATE",
        "REMARKS": r"REMARKS",
        "TOTAL VALUE": r"TOTAL\s+VALUE",
        "SUPP NAME M/S": r"^SUPP\s+NAME\s+M/S$"
    }.items():
        header[k] = find_value(rx, prefer="below")

    # Adjacent-only fields
    for k, rx in {
        "INSPECTION BY": r"INSPECTION\s+BY",
        "NAME": r"^NAME$",
        "DESIGNATION": r"DESIGNATION",
        "PHONE NO": r"^PHONE\s+NO$"
    }.items():
        header[k] = find_value(rx, prefer="adjacent")

    # DRG
    header["DRG"] = ""
    for table in tables:
        m = RX_DRG.search(table.get_text(" ", strip=True))
        if m:
            header["DRG"] = m.group(1)
            break

    # ---- numeric normalization ----
    for k in ["PURCHASE ORDER", "TIN NO", "RC NO", "DVN", "AMEND NO"]:
        header[k] = to_int(header.get(k))

    for k in ["PO-VALUE", "TOTAL VALUE", "NET PO VAL", "FOB VALUE", "EX RATE"]:
        header[k] = to_float(header.get(k))

    header["DRG"] = to_int(header.get("DRG"))

    # ---- date normalization ----
    for k in ["PO DATE", "QUOT-DATE", "ENQ DATE"]:
        header[k] = normalize_date(header.get(k))

    return header

# --------------------------------------------------
# Item Extraction
# --------------------------------------------------
def extract_items(soup):
    tables = soup.find_all("table")
    item_table = next(
        (t for t in tables if t.find(string=re.compile("MATERIAL CODE", re.I))),
        None
    )
    if not item_table:
        return []

    rows = item_table.find_all("tr")
    header_idx = next(
        (i for i, r in enumerate(rows) if r.find(string=re.compile("MATERIAL CODE", re.I))),
        None
    )
    if header_idx is None:
        return []

    items = []
    current_description = ""
    
    for row in rows[header_idx + 1:]:
        cols = [clean(td.get_text()) for td in row.find_all("td")]
        
        # Check if this is a description row (single cell with text, no numbers)
        if len(cols) == 1 and has_value(cols[0]) and not any(c.isdigit() for c in cols[0][:5]):
            current_description = cols[0]
            continue
        
        # Check if this is a data row
        if len(cols) < 8 or not any(c.isdigit() for c in cols[0]):
            continue

        items.append({
            "PO ITM": to_int(cols[0]),
            "MATERIAL CODE": cols[1],
            "DESCRIPTION": current_description,  # Add description
            "MTRL CAT": to_int(cols[2]) if len(cols) > 2 else None,
            "UNIT": cols[3] if len(cols) > 3 else "",
            "PO RATE": to_float(cols[4]) if len(cols) > 4 else None,
            "ORD QTY": to_int(cols[5]) if len(cols) > 5 else None,
            "RCD QTY": to_int(cols[6]) if len(cols) > 6 else None,
            "ITEM VALUE": to_float(cols[7]) if len(cols) > 7 else None,
            "LOT NO": to_int(cols[8]) if len(cols) > 8 else None,
            "DELY QTY": to_int(cols[9]) if len(cols) > 9 else None,
            "DELY DATE": normalize_date(cols[10]) if len(cols) > 10 else "",
            "ENTRY ALLOW DATE": normalize_date(cols[11]) if len(cols) > 11 else "",
            "DEST CODE": to_int(cols[12]) if len(cols) > 12 else None,
        })

    return items

# --------------------------------------------------
# UI
# --------------------------------------------------
files = st.file_uploader(
    "Upload PO HTML files",
    type=["html"],
    accept_multiple_files=True
)

if files:
    headers = []
    items = []

    for f in files:
        soup = BeautifulSoup(f.read(), "lxml")
        headers.append(extract_po_header(soup))
        items.extend(extract_items(soup))

    st.success(f"Processed {len(files)} file(s)")

    st.subheader("📋 Header Information")
    for i, h in enumerate(headers):
        st.markdown(f"**File {i + 1}**")
        st.dataframe(
            pd.DataFrame(h.items(), columns=["Field", "Value"]),
            hide_index=True
        )

    if items:
        st.subheader("📦 Line Items")
        df_items = pd.DataFrame(items)
        st.dataframe(df_items, hide_index=True)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        with pd.ExcelWriter(tmp.name, engine="openpyxl") as writer:
            for i, h in enumerate(headers):
                pd.DataFrame(h.items(), columns=["Field", "Value"]).to_excel(
                    writer,
                    sheet_name=f"Header_{i+1}" if len(headers) > 1 else "Header",
                    index=False
                )
            if items:
                df_items.to_excel(writer, sheet_name="Items", index=False)

        st.download_button(
            "📥 Download Excel",
            data=open(tmp.name, "rb"),
            file_name="po_extract.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
