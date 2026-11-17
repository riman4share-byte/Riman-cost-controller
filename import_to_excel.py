import json, sys, openpyxl

def main():
    with open(sys.argv[1] if len(sys.argv) > 1 else 'erp_import.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    wb = openpyxl.load_workbook('Riman_Cost_Accounting.xlsx')
    settings = data.get('settings', {})
    
    # 1. Settings and Assumptions (row 6+ for settings, but settings are in column B)
    ws = wb['Settings and Assumptions']
    ws['B6'] = 'Riman Fashion'  # Business name
    ws['B7'] = '2026-07-01'    # Financial period start
    ws['B8'] = '2027-06-30'    # Financial period end
    ws['B9'] = 'AED'            # Currency
    ws['B10'] = settings.get('vat', 5) / 100  # Default VAT rate
    ws['B12'] = settings.get('hoursDay', 8)   # Working hours per day
    ws['B13'] = settings.get('daysMonth', 26)  # Working days per month
    ws['B14'] = settings.get('prodPct', 80) / 100  # Practical productive-time %
    ws['B19'] = settings.get('wastage', 5) / 100  # Material wastage %
    ws['B20'] = settings.get('reworkTolerance', 5) / 100  # Rework %
    ws['B21'] = settings.get('margin', 30) / 100  # Target profit margin
    
    # 2. Employee Cost Master (table EmpM: A5:AT45, data from row 6)
    ws = wb['Employee Cost Master']
    staff = data.get('staff', [])
    row = 6
    for s in staff:
        ws.cell(row=row, column=1, value=s.get('id', ''))       # Employee ID
        ws.cell(row=row, column=2, value=s.get('name', ''))     # Employee Name
        ws.cell(row=row, column=4, value=s.get('job', ''))      # Job Title
        ws.cell(row=row, column=5, value=s.get('dept', ''))     # Department
        ws.cell(row=row, column=6, value=s.get('kind', ''))     # Labour Type
        ws.cell(row=row, column=9, value=s.get('salary', 0))    # Basic Salary
        ws.cell(row=row, column=13, value=s.get('housing', 0))  # Accommodation
        ws.cell(row=row, column=14, value=s.get('housed', 'no'))  # Housed in Villa
        ws.cell(row=row, column=17, value=s.get('medical', 0))  # Medical Insurance
        ws.cell(row=row, column=18, value=s.get('visaCost', 0)) # Visa Cost
        ws.cell(row=row, column=19, value=s.get('visaMonths', 1))  # Visa Cycle Months
        ws.cell(row=row, column=22, value=s.get('flight', 0) * 12)  # Annual Flight
        ws.cell(row=row, column=23, value=s.get('leave', 0))    # Annual Leave
        ws.cell(row=row, column=24, value=s.get('eosb', 0))     # EOSB
        ws.cell(row=row, column=25, value=s.get('other', 0))    # Other
        ws.cell(row=row, column=38, value=s.get('dept', ''))     # Notes
        row += 1
    
    # 3. Job Orders and Dresses (table Orders: A5:W155, data from row 6)
    ws = wb['Job Orders and Dresses']
    dresses = data.get('dresses', [])
    row = 6
    for d in dresses:
        ws.cell(row=row, column=1, value=f"JOB-{d.get('id', '')}")  # Job Number
        ws.cell(row=row, column=2, value=d.get('code', ''))         # Dress Code
        ws.cell(row=row, column=3, value=d.get('customer', ''))     # Customer Name
        ws.cell(row=row, column=4, value=d.get('type', 'custom'))   # Order Type
        ws.cell(row=row, column=5, value=d.get('start', ''))        # Order Date
        ws.cell(row=row, column=6, value=d.get('start', ''))        # Production Start
        ws.cell(row=row, column=7, value=d.get('date', ''))        # Delivery Date
        ws.cell(row=row, column=8, value='Completed')              # Order Status
        ws.cell(row=row, column=10, value=d.get('estimate', 0))     # Estimated Cost
        ws.cell(row=row, column=11, value=d.get('price', 0))       # Selling Price
        ws.cell(row=row, column=12, value=d.get('discount', 0))    # Discount
        ws.cell(row=row, column=14, value=settings.get('vat', 5)/100)  # VAT Rate
        row += 1
    
    # 4. Materials and Purchases (table MatBuy: A5:T305, data from row 6)
    ws = wb['Materials and Purchases']
    purchases = data.get('purchases', [])
    row = 6
    for p in purchases:
        ws.cell(row=row, column=1, value=p.get('date', ''))        # Date
        ws.cell(row=row, column=3, value=p.get('material', ''))     # Supplier (using material as supplier for now)
        ws.cell(row=row, column=4, value=p.get('material', '')[:10])  # Material Code
        ws.cell(row=row, column=5, value=p.get('material', ''))     # Material Name
        ws.cell(row=row, column=6, value='fabric')                  # Category
        ws.cell(row=row, column=7, value=p.get('unit', 'unit'))     # Unit
        ws.cell(row=row, column=8, value=p.get('qty', 0))           # Quantity Purchased
        ws.cell(row=row, column=9, value=p.get('price', 0))         # Unit Cost
        row += 1
    
    # 5. Monthly Overheads (table OHL: A5:AB405, data from row 6)
    ws = wb['Monthly Overheads']
    expenses = data.get('expenses', [])
    row = 6
    for e in expenses:
        ws.cell(row=row, column=1, value=e.get('month', ''))        # Month
        ws.cell(row=row, column=2, value=e.get('desc', ''))         # Description
        ws.cell(row=row, column=3, value=e.get('desc', ''))         # Supplier
        ws.cell(row=row, column=4, value=e.get('amount', 0))        # Amount Before VAT
        ws.cell(row=row, column=5, value=settings.get('vat', 5)/100) # VAT Rate
        ws.cell(row=row, column=8, value=e.get('category', ''))      # Expense Category
        row += 1
    
    # 6. Villa Allocation (table Villas: A5:Z9, data from row 6)
    ws = wb['Villa Allocation']
    villas = data.get('villas', [])
    row = 6
    for v in villas:
        ws.cell(row=row, column=1, value=v.get('name', ''))         # Villa Name
        ws.cell(row=row, column=2, value=v.get('rent', 0))          # Monthly Rent
        ws.cell(row=row, column=5, value=v.get('total', 0))         # Total Area
        ws.cell(row=row, column=6, value=v.get('workshop', 0))      # Atelier Area
        ws.cell(row=row, column=7, value=v.get('showroom', 0))      # Showroom Area
        ws.cell(row=row, column=8, value=v.get('office', 0))        # Administration Area
        ws.cell(row=row, column=9, value=v.get('housing', 0))       # Accommodation Area
        ws.cell(row=row, column=10, value=v.get('storage', 0))      # Storage Area
        row += 1
    
    output_path = 'Riman_Cost_Accounting_FILLED.xlsx'
    wb.save(output_path)
    print(f"Saved to {output_path}")
    print(f"  Settings: filled")
    print(f"  Staff: {len(staff)}")
    print(f"  Dresses: {len(dresses)}")
    print(f"  Purchases: {len(purchases)}")
    print(f"  Expenses: {len(expenses)}")
    print(f"  Villas: {len(villas)}")

if __name__ == '__main__':
    main()
