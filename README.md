# Riman Cost Control

A comprehensive dress/order costing system for Riman Fashion, consisting of two components:

## Components

### 1. Riman_Cost_Accounting.xlsx
A full Excel-based cost accounting model with 43 sheets covering:
- **Settings & Assumptions** — business settings, department setup
- **Job Orders & Dresses** — orders, prices, dates, status
- **Materials & Purchases** — purchase invoice lines and material usage per dress
- **Employee Cost Master** — full employer cost and productive hourly cost per employee
- **Timesheets** — hours per employee, job, and task
- **Outsourced Services** — external services charged to dresses
- **Monthly Overheads** — monthly expenses by category, department, and allocation basis
- **Villa Allocation** — villa rent split by use
- **Overhead Allocation Rates** — overhead and labour rates per department per month
- **Capacity & Idle Time** — available, practical, actual, and idle hours
- **Dress Cost Summary** — cost and profit per dress/order with missing-data warnings
- **Profitability Report** — period or monthly profit and loss down to operating profit
- **Monthly Profitability** — twelve-month profitability table
- **Cost Dashboard** — filtered key figures and charts
- **Error Checks** — all data checks and model tests with overall status

### 2. Riman_Cost_App.html
A standalone web application (single HTML file, ~300KB) for dress costing with:
- **Bilingual** — English and Arabic
- **Offline-first** — uses localStorage, works without internet
- **Backup/Restore** — JSON backup files
- **Excel Export** — download data as .xlsx
- **Example Data** — one-click fill with sample data
- **Cost Calculation** — full manufacturing cost, gross profit, operating profit
- **Checklist** — guided data entry workflow

## Costing Rules

- **Employee hourly cost** = Total monthly employee cost / practical productive hours
- **Direct labour** = Hours × employee's productive hourly cost (only for directly-attributable hours)
- **Material cost** = Quantity used × unit cost × (1 + wastage %)
- **Overhead per dress** = Attributable hours × department overhead rate for the month
- **Manufacturing cost** = Direct materials + direct labour + outsourced services + allocated manufacturing overhead
- **Gross profit** = Net selling price before VAT (after discount) − full manufacturing cost
- **Operating profit** = Gross profit − selling − administrative − accommodation/other period costs − unabsorbed overhead − idle labour
- **VAT** = Default 5%. Recoverable VAT excluded from cost; non-recoverable VAT added to cost
- **Suggested price** = Full manufacturing cost / (1 − target margin %)

## Getting Started

### Web App
1. Open `Riman_Cost_App.html` in any modern browser
2. Fill in Settings (hours/day, days/month, productive time %)
3. Add staff, villas, materials, dresses, hours, and expenses
4. View real-time cost and profit calculations
5. Export to Excel or save a backup

### Excel Workbook
1. Open `Riman_Cost_Accounting.xlsx` in Excel
2. Follow the step-by-step guide on the README sheet
3. Fill in amber/blue input cells
4. Check the Error Checks sheet for validation status
5. Review results on Dress Cost Summary, Profitability Report, and Cost Dashboard

## Development

### Running Tests
```bash
npm install
npm test
```

### Project Structure
```
riman coste controle/
├── Riman_Cost_Accounting.xlsx   # Excel cost accounting model
├── Riman_Cost_App.html           # Web application
├── calc.js                       # Extracted calculation logic (testable)
├── calc.test.js                  # Test suite (25 tests)
├── package.json                  # Node.js project config
└── README.md                     # This file
```

## ERP Integration

The project includes real business data extracted from the Riman Fashion ERP system (ERPNext at erp.riman.ae):

- **7 employees** with salary/CTC data
- **500 items** (306 dresses, 56 raw materials, 11 consumables, etc.)
- **500 sales invoices** (revenue data, Jan 2025 onwards)
- **128 purchase invoices** (cost data, Aug 2024 onwards)

The file `erp_import.json` contains a ready-to-import subset (50 dresses, 100 purchases, 50 expenses, 7 staff) that can be loaded into the web app.

### Data Mapping (ERPNext → Cost Control)

| ERPNext | Cost Control | Notes |
|---------|-------------|-------|
| Employee (CTC) | Staff (salary) | Only 1 employee has CTC filled |
| Sales Invoice Item (dress) | Dress (code, customer, date, price) | First non-accessory item per invoice |
| Purchase Invoice Item | Purchase (material, qty, price) | All purchase line items |
| Purchase Invoice (non-material) | Expense (desc, category, amount, month) | Categorized by supplier type |
| Cost Center | Villa (name) | "Riman Fashion" mapped to villa |
| Item Group | Dress type / Material category | Wedding, Party, Engagement, etc. |

### ERP Data Gaps
The following data is NOT available in ERPNext and must be entered manually:
- **Hours per dress** (no timesheet data)
- **Material usage per dress** (no BOM/usage tracking)
- **Villa rent and floor areas** (not tracked in ERPNext)
- **Monthly overhead breakdown** (not in ERPNext)
- **Employee cost components** (only CTC, no salary breakdown)
