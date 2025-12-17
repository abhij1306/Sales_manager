# Sensto Sales Manager

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
streamlit run app.py
```

3. Access at: http://localhost:8501

## Features

- **PO Upload**: Bulk upload HTML PO files with automatic data extraction
- **PO Search**: Search and edit POs with autocomplete

## Database

- SQLite database at `db/business.db`
- Normalized schema: Items + Deliveries tables
- Auto-calculated pending quantities

## Project Structure

```
Sales_Manager/
├── app.py              # Main application
├── config/             # Configuration
├── db/                 # Database schema
├── scraper/            # PO scraping logic
├── services/           # Business logic
├── ui/                 # Streamlit UI pages
└── utils/              # Utility functions
```
