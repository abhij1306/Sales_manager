# SenstoSales - Purchase Order Management System

**Version**: 2.0.0 (Stable Release)  
**Status**: Production Ready - All Core Features Complete ✅

## Overview

SenstoSales is a comprehensive Purchase Order management system designed for Senstographic (supplier) to manage purchase orders received from buyers (BHEL, NTPC, etc.). The system handles the complete lifecycle from PO ingestion to delivery challan and GST invoice generation.

## Features

### ✅ Implemented (Version 2.0)
- **Bulk PO Upload**: Upload multiple HTML PO files at once
- **PO List**: View all POs with status badges, values, and amendments
- **PO Detail & Edit**: Complete view and edit of all 45 PO fields
  - 28 header fields organized in 4 tabs
  - Items table with 9 columns (including DRG)
  - Delivery schedules (expandable by default)
  - Add/Delete items and deliveries
  - Inline editing with proper validation
- **Delivery Challan Management**: Create and manage DCs with full item tracking
- **GST Invoice Generation**: Create invoices linked to DCs
- **Dashboard**: Real-time KPIs and recent activity tracking
- **Search & Reports**: Comprehensive reconciliation and analytics

### 🚧 Planned (Phase 3+)
- Advanced reporting and analytics
- Payment tracking and reconciliation
- Multi-user support with authentication

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL/SQLite
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Scraper**: BeautifulSoup4

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SenstoSales
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
SenstoSales/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── routers/
│   │   └── services/
│   └── database/
├── frontend/         # Next.js frontend
│   ├── app/
│   │   ├── page.tsx
│   │   └── po/
│   └── components/
├── scraper/          # Standalone scraper
├── migrations/       # SQL migrations
├── tests/            # Test files (gitignored)
├── utils/            # Utility scripts
└── CONTEXT.md        # Complete project documentation
```

## Documentation

- **[CONTEXT.md](./CONTEXT.md)** - Complete project intelligence, architecture, and guidelines
- **[API Docs](http://localhost:8000/docs)** - Interactive API documentation (when backend is running)

## Database Schema

### Core Tables
- `purchase_orders` - 30 header fields
- `po_items` - 10 fields per item (including DRG)
- `po_deliveries` - 5 fields per delivery

See [CONTEXT.md](./CONTEXT.md) for complete schema details.

## Usage

### Upload POs
1. Navigate to `/po`
2. Click "Select PO Files"
3. Choose one or more HTML PO files
4. Click "Upload"
5. View results and check PO list

### View/Edit PO
1. Click on PO number in the list
2. View all details in organized tabs
3. Click "Edit" to enable editing
4. Modify fields, add/remove items/deliveries
5. Click "Save" (coming soon)

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Style
- Backend: PEP 8, type hints
- Frontend: TypeScript strict mode, ESLint

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - Senstographic Internal Use Only

## Support

For issues or questions, contact the development team.

---

**Last Updated**: 2025-12-18  
**Maintained by**: Senstographic Development Team
