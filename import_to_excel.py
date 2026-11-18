# Populate Riman_Cost_Accounting.xlsx (the cleaned 18-tab template) with web-app data.
# Usage: python import_to_excel.py <backup.json>
# All values go into the template's table columns; formulas/charts/formatting stay intact.

import json, sys, datetime
import openpyxl

TEMPLATE = 'Riman_Cost_Accounting.xlsx'
OUTPUT = 'Riman_Cost_Accounting_FILLED.xlsx'

def main():
    if len(sys.argv) < 2:
        print('Usage: python import_to_excel.py <data.json>'); sys.exit(1)
    with open(sys.argv[1], encoding='utf-8') as f:
        data = json.load(f)
    settings = data.get('settings', {})
    vat = settings.get('vat', 5) / 100
    wastage = settings.get('wastage', 5) / 100
    dresses = data.get('dresses', [])
    staff = data.get('staff', [])
    purchases = data.get('purchases', [])
    usage = data.get('usage', [])
    expenses = data.get('expenses', [])
    villas = data.get('villas', [])
    services = data.get('services', [])
    hours = data.get('hours', [])

    # dress lookup helpers
    dress_by_id = {d.get('id'): d for d in dresses}
    def job_no(did):
        return f"JOB-{did}" if did else ''
    def dress_code(did):
        d = dress_by_id.get(did, {})
        return d.get('code', '') or ''
    def dress_type(did):
        return dress_by_id.get(did, {}).get('type', 'custom') or 'custom'

    wb = openpyxl.load_workbook(TEMPLATE)

    # ---------- Settings and Assumptions ----------
    ws = wb['Settings and Assumptions']
    ws['B6'] = 'Riman Fashion'
    ws['B7'] = '2026-07-01'
    ws['B8'] = '2027-06-30'
    ws['B9'] = 'AED'
    ws['B10'] = vat
    ws['B11'] = settings.get('vatTreatment', 'recoverable')
    ws['B12'] = settings.get('hoursDay', 8)
    ws['B13'] = settings.get('daysMonth', 26)
    ws['B14'] = settings.get('prodPct', 80) / 100
    ws['B15'] = settings.get('allocMethod', 'Direct + driver')
    ws['B16'] = settings.get('villaMethod', 'Area')
    ws['B17'] = settings.get('staffSource', 'Payroll')
    ws['B18'] = 'Straight line'
    ws['B19'] = wastage
    ws['B20'] = settings.get('reworkTolerance', 5) / 100
    ws['B21'] = settings.get('margin', 30) / 100
    ws['B22'] = settings.get('monthBasis', 'Calendar month')

    # ---------- Employee Cost Master (EmpM: A5:AT45, data from row 6) ----------
    ws = wb['Employee Cost Master']
    row = 6
    for s in staff:
        ws.cell(row=row, column=1, value=s.get('id', ''))            # A Employee ID
        ws.cell(row=row, column=2, value=s.get('name', ''))          # B Employee Name
        ws.cell(row=row, column=4, value=s.get('job', ''))           # D Job Title
        ws.cell(row=row, column=5, value=s.get('dept', ''))          # E Department
        ws.cell(row=row, column=6, value=s.get('kind', ''))          # F Labour Type
        ws.cell(row=row, column=9, value=s.get('salary', 0))         # I Basic Salary
        ws.cell(row=row, column=13, value=s.get('housing', 0))       # M Accommodation Allowance
        ws.cell(row=row, column=14, value='Yes' if s.get('housed') == 'yes' else 'No')  # N Housed in Villa
        ws.cell(row=row, column=17, value=s.get('medical', 0))       # Q Medical Insurance Monthly
        ws.cell(row=row, column=18, value=s.get('visaCost', 0))      # R Visa and Residence Cost
        ws.cell(row=row, column=19, value=s.get('visaMonths', 1))    # S Visa Cycle Months
        ws.cell(row=row, column=20, value=s.get('permitCost', 0))   # T Work Permit Cost
        ws.cell(row=row, column=21, value=s.get('permitMonths', 1))  # U Permit Cycle Months
        ws.cell(row=row, column=22, value=s.get('flight', 0))       # V Annual Flight Ticket Cost
        ws.cell(row=row, column=23, value=s.get('leave', 0))         # W Annual Leave Provision
        ws.cell(row=row, column=24, value=s.get('eosb', 0))          # X End of Service Provision
        ws.cell(row=row, column=25, value=s.get('other', 0))         # Y Other Employer Costs
        ws.cell(row=row, column=38, value=s.get('dept', ''))         # AL Notes
        row += 1

    # ---------- Job Orders and Dresses (Orders: A5:W155, data from row 6) ----------
    ws = wb['Job Orders and Dresses']
    row = 6
    for d in dresses:
        ws.cell(row=row, column=1, value=job_no(d.get('id', '')))    # A Job Number
        ws.cell(row=row, column=2, value=d.get('code', ''))          # B Dress Code
        ws.cell(row=row, column=3, value=d.get('customer', ''))     # C Customer Name
        ws.cell(row=row, column=4, value=d.get('type', 'custom'))    # D Order Type
        ws.cell(row=row, column=5, value=d.get('start', ''))         # E Order Date
        ws.cell(row=row, column=6, value=d.get('start', ''))         # F Production Start Date
        ws.cell(row=row, column=7, value=d.get('date', ''))          # G Delivery Date
        ws.cell(row=row, column=8, value='Completed')                # H Order Status
        ws.cell(row=row, column=10, value=d.get('estimate', 0))      # J Estimated Cost
        ws.cell(row=row, column=11, value=d.get('price', 0))         # K Selling Price Before VAT
        ws.cell(row=row, column=12, value=d.get('discount', 0))      # L Discount
        ws.cell(row=row, column=14, value=vat)                       # N VAT Rate
        if d.get('extra'):
            ws.cell(row=row, column=22, value=f"Extra costs: {d.get('extra')}")  # V Notes
        row += 1

    # ---------- Materials and Purchases (MatBuy A5:T305, MatUse V5:AM405) ----------
    ws = wb['Materials and Purchases']
    row = 6
    for p in purchases:
        ws.cell(row=row, column=1, value=p.get('date', ''))         # A Date
        ws.cell(row=row, column=3, value=p.get('supplier', 'ERP'))   # C Supplier
        ws.cell(row=row, column=4, value=str(p.get('material', ''))[:12])  # D Material Code
        ws.cell(row=row, column=5, value=p.get('material', ''))      # E Material Name
        ws.cell(row=row, column=6, value=p.get('category', 'fabric'))  # F Category
        ws.cell(row=row, column=7, value=p.get('unit', 'unit'))      # G Unit
        ws.cell(row=row, column=8, value=p.get('qty', 0))            # H Quantity Purchased
        ws.cell(row=row, column=9, value=p.get('price', 0))          # I Unit Cost Before VAT
        ws.cell(row=row, column=10, value=vat)                       # J VAT Rate
        row += 1

    # MatUse (usage per dress)
    row = 6
    for u in usage:
        did = u.get('dressId', '')
        d = dress_by_id.get(did, {})
        ws.cell(row=row, column=22, value=u.get('date', d.get('date', '')))  # V Usage Date
        ws.cell(row=row, column=23, value=job_no(did))                       # W Job Number
        ws.cell(row=row, column=24, value=d.get('code', ''))                 # X Dress Code
        ws.cell(row=row, column=25, value=str(u.get('material', ''))[:12])   # Y Material Code
        ws.cell(row=row, column=26, value=u.get('material', ''))             # Z Material Name
        ws.cell(row=row, column=27, value=u.get('unit', 'unit'))            # AA Unit
        ws.cell(row=row, column=28, value=u.get('qty', 0))                   # AB Quantity Used
        ws.cell(row=row, column=29, value=u.get('invoice', ''))             # AC Invoice Number
        ws.cell(row=row, column=30, value='Yes')                             # AD Directly Attributable
        ws.cell(row=row, column=31, value='No')                              # AE Shared Between Dresses
        ws.cell(row=row, column=32, value=wastage)                          # AF Wastage Percentage
        ws.cell(row=row, column=33, value='Yes' if u.get('rework') == 'yes' else 'No')  # AG Rework
        ws.cell(row=row, column=40, value=u.get('note', ''))                # AL Notes
        row += 1

    # ---------- Timesheets (Hrs: A5:AE805, data from row 6) ----------
    ws = wb['Timesheets']
    row = 6
    for h in hours:
        did = h.get('dressId', '')
        d = dress_by_id.get(did, {})
        sid = h.get('staffId', '')
        s = next((x for x in staff if x.get('id') == sid), {})
        ws.cell(row=row, column=1, value=h.get('date', ''))                  # A Date
        ws.cell(row=row, column=2, value=job_no(did))                       # B Job Number
        ws.cell(row=row, column=3, value=d.get('code', ''))                  # C Dress Code
        ws.cell(row=row, column=4, value=s.get('id', ''))                   # D Employee ID
        ws.cell(row=row, column=5, value=s.get('name', ''))                 # E Employee Name
        ws.cell(row=row, column=6, value=s.get('dept', ''))                 # F Department
        ws.cell(row=row, column=7, value=h.get('task', ''))                # G Task Type
        ws.cell(row=row, column=8, value=h.get('hours', 0))                 # H Number of Hours
        ws.cell(row=row, column=9, value='Yes' if h.get('chargeable') == 'yes' else 'No')  # I Directly Attributable
        ws.cell(row=row, column=10, value='Yes' if h.get('rework') == 'yes' else 'No')     # J Rework
        ws.cell(row=row, column=13, value=h.get('note', ''))                # M Notes
        row += 1

    # ---------- Outsourced Services (Outs: A5:Q155, data from row 6) ----------
    ws = wb['Outsourced Services']
    row = 6
    for sv in services:
        did = sv.get('dressId', '')
        d = dress_by_id.get(did, {})
        ws.cell(row=row, column=1, value=sv.get('date', d.get('date', '')))  # A Date
        ws.cell(row=row, column=2, value=sv.get('supplier', 'ERP'))         # B Supplier
        ws.cell(row=row, column=4, value=sv.get('type', 'Outsourced'))      # D Service Type
        ws.cell(row=row, column=5, value=sv.get('desc', ''))                 # E Service Description
        ws.cell(row=row, column=6, value=job_no(did))                       # F Job Number
        ws.cell(row=row, column=7, value=d.get('code', ''))                  # G Dress Code
        ws.cell(row=row, column=8, value=sv.get('amount', 0))                # H Amount Before VAT
        ws.cell(row=row, column=9, value=vat)                               # I VAT Rate
        ws.cell(row=row, column=12, value='Yes')                            # L Directly Attributable
        ws.cell(row=row, column=13, value='Yes' if sv.get('rework') == 'yes' else 'No')  # M Rework
        ws.cell(row=row, column=16, value=sv.get('note', ''))              # P Notes
        row += 1

    # ---------- Monthly Overheads (OHL: A5:AB405, data from row 6) ----------
    ws = wb['Monthly Overheads']
    row = 6
    for e in expenses:
        ws.cell(row=row, column=1, value=e.get('month', ''))                # A Month
        ws.cell(row=row, column=2, value=e.get('desc', ''))                 # B Description
        ws.cell(row=row, column=3, value=e.get('desc', ''))                 # C Supplier
        ws.cell(row=row, column=4, value=e.get('amount', 0))                # D Amount Before VAT
        ws.cell(row=row, column=5, value=vat)                               # E VAT Rate
        ws.cell(row=row, column=8, value=e.get('category', 'other'))        # H Expense Category
        row += 1

    # ---------- Villa Allocation (Villas: A5:Z9, data from row 6) ----------
    ws = wb['Villa Allocation']
    row = 6
    for v in villas:
        ws.cell(row=row, column=1, value=v.get('name', ''))                 # A Villa Name
        ws.cell(row=row, column=2, value=v.get('rent', 0))                  # B Monthly Rent
        ws.cell(row=row, column=5, value=v.get('total', 0))                 # E Total Area
        ws.cell(row=row, column=6, value=v.get('workshop', 0))              # F Atelier Area
        ws.cell(row=row, column=7, value=v.get('showroom', 0))              # G Showroom Area
        ws.cell(row=row, column=8, value=v.get('office', 0))                # H Administration Area
        ws.cell(row=row, column=9, value=v.get('housing', 0))               # I Accommodation Area
        ws.cell(row=row, column=10, value=v.get('storage', 0))              # J Storage Area
        row += 1

    wb.save(OUTPUT)
    print(f'Saved {OUTPUT}')
    print(f'  staff={len(staff)} dresses={len(dresses)} purchases={len(purchases)} usage={len(usage)}')
    print(f'  hours={len(hours)} services={len(services)} expenses={len(expenses)} villas={len(villas)}')

if __name__ == '__main__':
    main()
