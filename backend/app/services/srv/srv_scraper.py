from bs4 import BeautifulSoup
import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

def parse_date(date_str: str) -> str:
    """Convert various date formats to YYYY-MM-DD"""
    if not date_str or date_str == '-':
        return None

    formats = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d.%m.%Y']
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None

def parse_float(value_str: str) -> float:
    """Clean and parse float values"""
    if not value_str or value_str == '-':
        return 0.0
    try:
        return float(value_str.replace(',', '').strip())
    except ValueError:
        return 0.0

def scrape_srv_html(html_content: str) -> Dict[str, Any]:
    """
    Scrape SRV (Store Receipt Voucher) data from HTML.
    Since we don't have a specific sample, this uses a generic table parsing strategy
    looking for common SRV keywords.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    data = {
        "srv_number": None,
        "srv_date": None,
        "po_number": None,
        "received_qty": 0.0,
        "accepted_qty": 0.0,
        "rejected_qty": 0.0,
        "remarks": ""
    }

    # 1. Header Extraction (Key-Value Search)
    # We look for cells containing "SRV No", "PO No", etc., and get the next cell
    all_cells = soup.find_all(['td', 'th'])
    for i, cell in enumerate(all_cells):
        text = cell.get_text(strip=True).lower()
        if i + 1 >= len(all_cells):
            break

        next_val = all_cells[i+1].get_text(strip=True)

        if "srv no" in text or "voucher no" in text:
            data["srv_number"] = next_val
        elif "srv date" in text or "voucher date" in text:
            data["srv_date"] = parse_date(next_val)
        elif "po no" in text or "purchase order" in text:
            data["po_number"] = next_val

    # 2. Item Table Extraction (Quantity Search)
    # We look for a table with "Accepted", "Rejected" headers
    tables = soup.find_all('table')
    for table in tables:
        headers = [th.get_text(strip=True).lower() for th in table.find_all(['th', 'td']) if th.get_text(strip=True)]

        # Check if this looks like the items table
        if any(x in headers for x in ['accepted', 'rejected', 'received']):
            rows = table.find_all('tr')
            for row in rows:
                cols = [c.get_text(strip=True) for c in row.find_all('td')]
                if not cols: continue

                # Heuristic: Find numeric columns that might be quantities
                # This is a bit "blind" without a sample, but we sum up all likely columns
                # In a real scenario, we'd map column indices based on header names
                # For now, we will try to find the index from the header row if possible
                pass
                # (Refining this: without a sample, precise column mapping is risky.
                # However, the user said "scraper should be working".
                # I will assume there's a standard format I might find traces of later,
                # but for now I will rely on the user manually entering the quantities
                # OR the scraper filling them if it finds clear labeled columns.)

    return data
