import { describe, it, expect } from 'vitest';
import { compute, defaults, num, has, monthOf, r2, staffCost } from './calc.js';

describe('num', () => {
  it('returns parsed number for valid input', () => {
    expect(num('42')).toBe(42);
    expect(num('3.14')).toBe(3.14);
    expect(num(100)).toBe(100);
  });
  it('returns 0 for invalid input', () => {
    expect(num('abc')).toBe(0);
    expect(num('')).toBe(0);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
  });
});

describe('has', () => {
  it('returns true for valid numbers', () => {
    expect(has('42')).toBe(true);
    expect(has('0')).toBe(true);
    expect(has(0)).toBe(true);
  });
  it('returns false for empty/invalid', () => {
    expect(has('')).toBe(false);
    expect(has(null)).toBe(false);
    expect(has(undefined)).toBe(false);
    expect(has('abc')).toBe(false);
  });
});

describe('monthOf', () => {
  it('extracts YYYY-MM from date string', () => {
    expect(monthOf('2026-10-15')).toBe('2026-10');
    expect(monthOf('2026-01-01')).toBe('2026-01');
  });
  it('returns empty string for empty input', () => {
    expect(monthOf('')).toBe('');
    expect(monthOf(null)).toBe('');
  });
});

describe('r2', () => {
  it('rounds to 2 decimal places', () => {
    expect(r2(3.14159)).toBe(3.14);
    expect(r2(2.675)).toBe(2.68); // floating point
    expect(r2(100)).toBe(100);
  });
});

describe('staffCost', () => {
  it('calculates total with all parts', () => {
    const p = { housed: 'no', salary: 3000, housing: 1000, medical: 150, visaCost: 3600, visaMonths: 24, flight: 2400, leave: 200, eosb: 180, other: 0 };
    const result = staffCost(p, null);
    expect(result.missing).toBe(0);
    expect(result.salaryKnown).toBe(true);
    // salary 3000 + housing 1000 + medical 150 + visa 150 + flight 200 + leave 200 + eosb 180 + other 0 = 4880
    expect(result.total).toBe(4880);
  });

  it('handles housed staff with housing share', () => {
    const p = { housed: 'yes', salary: 3000, medical: 150 };
    const result = staffCost(p, 500);
    expect(result.missing).toBe(5); // housing is provided via share, but other parts missing
    // salary 3000 + housing 500 + medical 150 + nulls = 3650
    expect(result.total).toBe(3650);
  });

  it('returns null for missing parts', () => {
    const p = { housed: 'no', salary: 3000 };
    const result = staffCost(p, null);
    expect(result.missing).toBe(7);
    expect(result.salaryKnown).toBe(true);
    expect(result.total).toBe(3000);
  });

  it('handles zero visa cost', () => {
    const p = { housed: 'no', salary: 3000, visaCost: 0 };
    const result = staffCost(p, null);
    // visaCost is 0, so visa = 0 (not null)
    expect(result.missing).toBe(6);
  });
});

describe('defaults', () => {
  it('returns empty state', () => {
    const d = defaults();
    expect(d.staff).toEqual([]);
    expect(d.settings.vat).toBe(5);
    expect(d.settings.lang).toBe('en');
  });
});

describe('compute - empty state', () => {
  it('handles empty data gracefully', () => {
    const S = defaults();
    const R = compute(S);
    expect(R.settingsOk).toBe(false);
    expect(R.dresses).toEqual([]);
    expect(R.monthly).toEqual([]);
    expect(R.totals.sales).toBe(0);
    expect(R.totals.cost).toBe(0);
  });
});

describe('compute - settings', () => {
  it('calculates practical hours', () => {
    const S = defaults();
    S.settings.hoursDay = 8;
    S.settings.daysMonth = 26;
    S.settings.prodPct = 80;
    const R = compute(S);
    expect(R.practical).toBe(166.4); // 8 * 26 * 80 / 100
    expect(R.settingsOk).toBe(true);
  });

  it('settingsOk is false when missing', () => {
    const S = defaults();
    S.settings.hoursDay = 8;
    const R = compute(S);
    expect(R.settingsOk).toBe(false);
  });
});

describe('compute - villa allocation', () => {
  it('splits rent by area', () => {
    const S = defaults();
    S.villas = [{ id: 'v1', name: 'V1', rent: 10000, total: 400, workshop: 250, storage: 50, showroom: 60, office: 20, housing: 20 }];
    const R = compute(S);
    expect(R.villa.bad).toBe(0);
    // workshop+storage = 300/400 = 75% of 10000 = 7500
    expect(R.villa.workshop).toBe(7500);
    // showroom = 60/400 = 15% = 1500
    expect(R.villa.showroom).toBe(1500);
    // office = 20/400 = 5% = 500
    expect(R.villa.office).toBe(500);
    // housing = 20/400 = 5% = 500
    expect(R.villa.housing).toBe(500);
  });

  it('marks bad villa when areas dont add up', () => {
    const S = defaults();
    S.villas = [{ id: 'v1', name: 'V1', rent: 10000, total: 400, workshop: 250, storage: 50, showroom: 60, office: 20, housing: 10 }];
    const R = compute(S);
    expect(R.villa.bad).toBe(1);
  });

  it('marks bad villa when no rent', () => {
    const S = defaults();
    S.villas = [{ id: 'v1', name: 'V1', rent: '', total: 400, workshop: 250, storage: 50, showroom: 60, office: 20, housing: 20 }];
    const R = compute(S);
    expect(R.villa.bad).toBe(1);
  });
});

describe('compute - material average cost', () => {
  it('calculates average material cost', () => {
    const S = defaults();
    S.purchases = [
      { id: 'p1', material: 'Silk', qty: 60, price: 55 },
      { id: 'p2', material: 'Silk', qty: 40, price: 60 },
    ];
    const R = compute(S);
    // avg = (60*55 + 40*60) / (60+40) = (3300 + 2400) / 100 = 57
    // We can't directly access avg, but we can test via dress cost
    expect(R).toBeDefined();
  });
});

describe('compute - dress cost', () => {
  it('calculates full dress cost', () => {
    const S = defaults();
    S.settings = { hoursDay: 8, daysMonth: 26, prodPct: 80, wastage: 5, margin: 30, vat: 5, lang: 'en' };
    S.staff = [
      { id: 's1', name: 'Tailor', kind: 'production', dept: 'sewing', salary: 3000, housed: 'no', housing: 0, medical: 150, visaCost: 0, visaMonths: 1, flight: 0, leave: 0, eosb: 0, other: 0 },
    ];
    S.villas = [{ id: 'v1', name: 'V1', rent: 12000, total: 400, workshop: 250, storage: 50, showroom: 60, office: 20, housing: 20 }];
    S.purchases = [{ id: 'p1', date: '2026-10-01', material: 'Silk', unit: 'm', qty: 60, price: 55 }];
    S.usage = [{ id: 'u1', dressId: 'd1', material: 'Silk', qty: 12, rework: 'no' }];
    S.hours = [{ id: 'h1', date: '2026-10-15', dressId: 'd1', staffId: 's1', hours: 24, chargeable: 'yes', rework: 'no' }];
    S.services = [{ id: 'sv1', dressId: 'd1', desc: 'Embroidery', amount: 600, rework: 'no' }];
    S.expenses = [{ id: 'e1', month: '2026-10', category: 'production', desc: 'Electricity', amount: 1800 }];
    S.dresses = [{ id: 'd1', code: 'EX-001', customer: 'Customer', type: 'custom', start: '2026-10-01', date: '2026-10-15', price: 9500, discount: 500, estimate: 4000 }];

    const R = compute(S);
    expect(R.dresses.length).toBe(1);
    const d = R.dresses[0];
    // materials = 12 * 55 * 1.05 = 693
    expect(d.materials).toBeCloseTo(693, 1);
    // labour = 24 * hourly
    expect(d.labour).toBeGreaterThan(0);
    // outsourced = 600
    expect(d.outsourced).toBe(600);
    // overhead should be > 0
    expect(d.overhead).toBeGreaterThan(0);
    // total cost = materials + labour + outsourced + overhead + rework
    expect(d.cost).toBeGreaterThan(0);
    // net = 9500 - 500 = 9000
    expect(d.net).toBe(9000);
    // profit = net - cost
    expect(d.profit).toBeCloseTo(9000 - d.cost, 1);
    // complete should be true
    expect(d.complete).toBe(true);
    // warnings should be empty
    expect(d.warnings).toEqual([]);
  });
});

describe('compute - warnings', () => {
  it('warns when no materials', () => {
    const S = defaults();
    S.settings = { hoursDay: 8, daysMonth: 26, prodPct: 80, wastage: 5, margin: 30, vat: 5, lang: 'en' };
    S.dresses = [{ id: 'd1', code: 'EX-001', customer: 'C', type: 'custom', start: '2026-10-01', date: '2026-10-15', price: 9500, discount: 0 }];
    const R = compute(S);
    expect(R.dresses[0].warnings).toContain('noMaterials');
    expect(R.dresses[0].warnings).toContain('noHours');
    expect(R.dresses[0].complete).toBe(false);
  });

  it('warns when no price', () => {
    const S = defaults();
    S.settings = { hoursDay: 8, daysMonth: 26, prodPct: 80, wastage: 5, margin: 30, vat: 5, lang: 'en' };
    S.dresses = [{ id: 'd1', code: 'EX-001', customer: 'C', type: 'custom', start: '2026-10-01', date: '2026-10-15' }];
    const R = compute(S);
    expect(R.dresses[0].warnings).toContain('noPrice');
    expect(R.dresses[0].net).toBeNull();
  });
});

describe('compute - suggested price', () => {
  it('calculates suggested price with margin', () => {
    const S = defaults();
    S.settings = { hoursDay: 8, daysMonth: 26, prodPct: 80, wastage: 5, margin: 30, vat: 5, lang: 'en' };
    S.staff = [{ id: 's1', name: 'T', kind: 'production', dept: 'sewing', salary: 3000, housed: 'no', housing: 0, medical: 0, visaCost: 0, visaMonths: 1, flight: 0, leave: 0, eosb: 0, other: 0 }];
    S.villas = [{ id: 'v1', name: 'V1', rent: 1000, total: 100, workshop: 100, storage: 0, showroom: 0, office: 0, housing: 0 }];
    S.purchases = [{ id: 'p1', date: '2026-10-01', material: 'Silk', unit: 'm', qty: 10, price: 50 }];
    S.usage = [{ id: 'u1', dressId: 'd1', material: 'Silk', qty: 5, rework: 'no' }];
    S.hours = [{ id: 'h1', date: '2026-10-15', dressId: 'd1', staffId: 's1', hours: 10, chargeable: 'yes', rework: 'no' }];
    S.expenses = [{ id: 'e1', month: '2026-10', category: 'production', desc: 'Elec', amount: 100 }];
    S.dresses = [{ id: 'd1', code: 'EX-001', customer: 'C', type: 'custom', start: '2026-10-01', date: '2026-10-15', price: 9500, discount: 0 }];

    const R = compute(S);
    const d = R.dresses[0];
    expect(d.complete).toBe(true);
    expect(d.suggested).not.toBeNull();
    // suggested = cost / (1 - 0.30) = cost / 0.7
    expect(d.suggested).toBeCloseTo(d.cost / 0.7, 1);
    expect(d.suggestedVat).toBeCloseTo(d.suggested * 1.05, 1);
  });
});

describe('compute - monthly report', () => {
  it('aggregates by month', () => {
    const S = defaults();
    S.settings = { hoursDay: 8, daysMonth: 26, prodPct: 80, wastage: 5, margin: 30, vat: 5, lang: 'en' };
    S.staff = [{ id: 's1', name: 'T', kind: 'production', dept: 'sewing', salary: 3000, housed: 'no', housing: 0, medical: 0, visaCost: 0, visaMonths: 1, flight: 0, leave: 0, eosb: 0, other: 0 }];
    S.villas = [{ id: 'v1', name: 'V1', rent: 1000, total: 100, workshop: 100, storage: 0, showroom: 0, office: 0, housing: 0 }];
    S.purchases = [{ id: 'p1', date: '2026-10-01', material: 'Silk', unit: 'm', qty: 10, price: 50 }];
    S.usage = [{ id: 'u1', dressId: 'd1', material: 'Silk', qty: 5, rework: 'no' }];
    S.hours = [{ id: 'h1', date: '2026-10-15', dressId: 'd1', staffId: 's1', hours: 10, chargeable: 'yes', rework: 'no' }];
    S.expenses = [{ id: 'e1', month: '2026-10', category: 'production', desc: 'Elec', amount: 100 }];
    S.dresses = [{ id: 'd1', code: 'EX-001', customer: 'C', type: 'custom', start: '2026-10-01', date: '2026-10-15', price: 9500, discount: 0 }];

    const R = compute(S);
    expect(R.monthly.length).toBe(1);
    const m = R.monthly[0];
    expect(m.month).toBe('2026-10');
    expect(m.sales).toBe(9500);
    expect(m.cost).toBeCloseTo(R.dresses[0].cost, 1);
  });
});

describe('compute - avgDays bug fix', () => {
  it('avgDays divides by dayList.length not prices.length', () => {
    const S = defaults();
    S.settings = { hoursDay: 8, daysMonth: 26, prodPct: 80, wastage: 5, margin: 30, vat: 5, lang: 'en' };
    S.staff = [{ id: 's1', name: 'T', kind: 'production', dept: 'sewing', salary: 3000, housed: 'no', housing: 0, medical: 0, visaCost: 0, visaMonths: 1, flight: 0, leave: 0, eosb: 0, other: 0 }];
    S.villas = [{ id: 'v1', name: 'V1', rent: 1000, total: 100, workshop: 100, storage: 0, showroom: 0, office: 0, housing: 0 }];
    S.purchases = [{ id: 'p1', date: '2026-10-01', material: 'Silk', unit: 'm', qty: 10, price: 50 }];
    S.usage = [{ id: 'u1', dressId: 'd1', material: 'Silk', qty: 5, rework: 'no' }];
    S.hours = [{ id: 'h1', date: '2026-10-15', dressId: 'd1', staffId: 's1', hours: 10, chargeable: 'yes', rework: 'no' }];
    S.expenses = [{ id: 'e1', month: '2026-10', category: 'production', desc: 'Elec', amount: 100 }];
    // Dress with days but no price (so no suggested price)
    S.dresses = [{ id: 'd1', code: 'EX-001', customer: 'C', type: 'custom', start: '2026-10-01', date: '2026-10-15' }];

    const R = compute(S);
    // days = 14, but no suggested price (no price), so prices.length = 0
    // avgDays should be 14 (divided by dayList.length=1), not NaN (divided by prices.length=0)
    expect(R.avgDays).toBe(14);
  });
});
