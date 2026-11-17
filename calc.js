// ---- Calculation logic (extracted from Riman_Cost_App.html) ----
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const has = (v) => v !== '' && v !== null && v !== undefined && isFinite(parseFloat(v));
const monthOf = (d) => (d ? String(d).slice(0, 7) : '');
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const DEPTS = ['cutting', 'sewing', 'embroidery', 'finishing', 'alterations', 'design'];

function defaults() {
  return {
    settings: { hoursDay: '', daysMonth: '', prodPct: '', wastage: '', margin: '', vat: 5, lang: 'en' },
    staff: [], villas: [], dresses: [], purchases: [], usage: [], hours: [], services: [], expenses: [],
  };
}

function staffCost(p, housingShare) {
  const housed = p.housed === 'yes';
  const housing = housed ? housingShare : (has(p.housing) ? num(p.housing) : null);
  const visa = has(p.visaCost) ? (num(p.visaCost) === 0 ? 0 : (num(p.visaMonths) > 0 ? num(p.visaCost) / num(p.visaMonths) : null)) : null;
  const flight = has(p.flight) ? num(p.flight) / 12 : null;
  const parts = [has(p.salary) ? num(p.salary) : null, housing, has(p.medical) ? num(p.medical) : null, visa, flight,
    has(p.leave) ? num(p.leave) : null, has(p.eosb) ? num(p.eosb) : null, has(p.other) ? num(p.other) : null];
  const missing = parts.filter((x) => x === null).length;
  const total = parts.reduce((a, x) => a + (x === null ? 0 : x), 0);
  return { total, missing, salaryKnown: parts[0] !== null };
}

function compute(S) {
  const st = S.settings;
  const practical = (num(st.hoursDay) * num(st.daysMonth) * num(st.prodPct)) / 100;
  const settingsOk = has(st.hoursDay) && has(st.daysMonth) && has(st.prodPct) && practical > 0;

  const villa = { workshop: 0, showroom: 0, office: 0, housing: 0, bad: 0 };
  S.villas.forEach((v) => {
    const total = num(v.total);
    const used = num(v.workshop) + num(v.storage) + num(v.showroom) + num(v.office) + num(v.housing);
    if (!(total > 0) || Math.abs(used - total) > 0.001 || !has(v.rent)) { villa.bad++; return; }
    const r = num(v.rent);
    villa.workshop += (r * (num(v.workshop) + num(v.storage))) / total;
    villa.showroom += (r * num(v.showroom)) / total;
    villa.office += (r * num(v.office)) / total;
    villa.housing += (r * num(v.housing)) / total;
  });
  const housed = S.staff.filter((p) => p.housed === 'yes');
  const housingShare = housed.length && villa.housing > 0 ? villa.housing / housed.length : null;

  const staffById = {};
  S.staff.forEach((p) => {
    const c = staffCost(p, housingShare);
    staffById[p.id] = Object.assign({}, p, c, { hourly: p.kind === 'production' && settingsOk && c.salaryKnown ? c.total / practical : null });
  });
  const prodStaff = S.staff.filter((p) => p.kind === 'production');
  const staffSum = (kind) => S.staff.filter((p) => p.kind === kind).reduce((a, p) => a + staffById[p.id].total, 0);
  const staffWorkshop = staffSum('workshop'), staffSales = staffSum('sales'), staffAdmin = staffSum('admin');

  const mat = {};
  S.purchases.forEach((p) => {
    const k = (p.material || '').trim().toLowerCase();
    if (!k) return;
    mat[k] = mat[k] || { qty: 0, cost: 0 };
    mat[k].qty += num(p.qty); mat[k].cost += num(p.qty) * num(p.price);
  });
  const avg = (name) => { const m = mat[(name || '').trim().toLowerCase()]; return m && m.qty > 0 ? m.cost / m.qty : null; };

  const mset = new Set();
  S.hours.forEach((h) => mset.add(monthOf(h.date)));
  S.expenses.forEach((e) => mset.add(monthOf(e.month)));
  S.dresses.forEach((d) => mset.add(monthOf(d.date)));
  mset.delete('');
  const months = [...mset].sort();

  const prodHoursTotal = settingsOk ? prodStaff.length * practical : 0;
  const poolBy = {}, sellBy = {}, adminBy = {};
  months.forEach((m) => {
    let prodExp = 0, hasProd = false, sell = 0, adm = 0;
    S.expenses.forEach((e) => {
      if (monthOf(e.month) !== m) return;
      if (e.category === 'production') { prodExp += num(e.amount); hasProd = true; }
      else if (e.category === 'selling') sell += num(e.amount);
      else adm += num(e.amount);
    });
    const poolKnown = hasProd || villa.workshop > 0 || staffWorkshop > 0;
    poolBy[m] = poolKnown ? prodExp + villa.workshop + staffWorkshop : null;
    sellBy[m] = sell + villa.showroom + staffSales;
    adminBy[m] = adm + villa.office + staffAdmin;
  });
  const ohRate = (m) => (prodHoursTotal > 0 && poolBy[m] !== null && poolBy[m] !== undefined ? poolBy[m] / prodHoursTotal : null);

  const applied = {}, actualHrs = {}, workedBy = {};
  const dresses = S.dresses.map((d) => {
    const w = [];
    const uses = S.usage.filter((u) => u.dressId === d.id);
    let materials = 0, rework = 0;
    uses.forEach((u) => {
      const c = avg(u.material);
      if (c === null) { w.push('missingMaterialPrice:' + u.material); return; }
      const cost = num(u.qty) * c * (1 + num(st.wastage) / 100);
      if (u.rework === 'yes') rework += cost; else materials += cost;
    });
    if (!uses.length) w.push('noMaterials');

    const hrs = S.hours.filter((h) => h.dressId === d.id && h.chargeable !== 'no');
    let labour = 0, overhead = 0, hoursTotal = 0;
    const byDept = {};
    let costIncomplete = false;
    hrs.forEach((h) => {
      const p = staffById[h.staffId];
      const hours = num(h.hours), m = monthOf(h.date);
      hoursTotal += hours;
      actualHrs[m] = (actualHrs[m] || 0) + hours;
      workedBy[m] = workedBy[m] || {}; workedBy[m][h.staffId] = (workedBy[m][h.staffId] || 0) + hours;
      let lab = 0, oh = 0;
      if (!p || p.hourly === null) { if (!w.includes('missingStaffCost')) w.push('missingStaffCost'); }
      else { lab = hours * p.hourly; if (p.missing > 0) costIncomplete = true; }
      const rate = ohRate(m);
      if (rate === null) { if (!w.includes('missingOverhead')) w.push('missingOverhead'); }
      else { oh = hours * rate; applied[m] = (applied[m] || 0) + oh; }
      if (h.rework === 'yes') rework += lab + oh; else { labour += lab; overhead += oh; }
      const dk = p && p.dept ? p.dept : 'other';
      byDept[dk] = byDept[dk] || { hours: 0, cost: 0 };
      byDept[dk].hours += hours; byDept[dk].cost += lab;
    });
    if (!hrs.length) w.push('noHours');
    if (costIncomplete) w.push('incompleteStaffCost');

    const svc = S.services.filter((s) => s.dressId === d.id);
    const outsourced = svc.filter((s) => s.rework !== 'yes').reduce((a, s) => a + num(s.amount), 0);
    rework += svc.filter((s) => s.rework === 'yes').reduce((a, s) => a + num(s.amount), 0);

    const cost = materials + labour + outsourced + overhead + rework;
    const priceKnown = has(d.price);
    const net = priceKnown ? num(d.price) - num(d.discount) : null;
    if (!priceKnown) w.push('noPrice');
    const profit = net === null ? null : net - cost;
    const complete = w.length === 0;
    const m = num(st.margin) / 100;
    const suggested = complete && has(st.margin) && m < 1 && cost > 0 ? cost / (1 - m) : null;
    const days = d.start && d.date ? Math.round((new Date(d.date) - new Date(d.start)) / 86400000) : null;
    return {
      id: d.id, code: d.code, customer: d.customer, type: d.type, date: d.date, start: d.start,
      materials, labour, outsourced, overhead, rework, hours: hoursTotal, byDept, cost, net, profit,
      margin: net && net > 0 ? profit / net : null, warnings: w, complete, days,
      suggested, suggestedVat: suggested === null ? null : suggested * (1 + num(st.vat) / 100),
      overEstimate: has(d.estimate) && cost > num(d.estimate),
    };
  });

  const rows = months.map((m) => {
    const ds = dresses.filter((d) => monthOf(d.date) === m);
    const sales = ds.reduce((a, d) => a + (d.net || 0), 0);
    const cost = ds.reduce((a, d) => a + d.cost, 0);
    const pool = poolBy[m] || 0, app = applied[m] || 0;
    const unused = Math.max(0, pool - app);
    let idleHours = 0, idleLabour = 0;
    if (settingsOk) prodStaff.forEach((p) => {
      const worked = (workedBy[m] && workedBy[m][p.id]) || 0;
      const idle = Math.max(0, practical - worked);
      idleHours += idle;
      if (staffById[p.id].hourly !== null) idleLabour += idle * staffById[p.id].hourly;
    });
    const gross = sales - cost;
    return {
      month: m, sales, cost, gross, selling: sellBy[m], admin: adminBy[m], unused, idleLabour, idleHours,
      utilisation: prodHoursTotal > 0 ? (actualHrs[m] || 0) / prodHoursTotal : null,
      operating: gross - sellBy[m] - adminBy[m] - unused - idleLabour,
    };
  });

  const tot = dresses.reduce((a, d) => ({ sales: a.sales + (d.net || 0), cost: a.cost + d.cost }), { sales: 0, cost: 0 });
  const prices = dresses.map((d) => d.suggested).filter((x) => x !== null);
  const dayList = dresses.map((d) => d.days).filter((x) => x !== null && x >= 0);

  const checklist = [
    ['settings', settingsOk],
    ['staffCost', S.staff.length > 0 && S.staff.every((p) => staffById[p.id].salaryKnown && staffById[p.id].missing === 0)],
    ['villas', S.villas.length > 0 && villa.bad === 0],
    ['expenses', S.expenses.some((e) => e.category === 'production')],
    ['dresses', S.dresses.length > 0],
    ['materials', S.purchases.length > 0],
    ['hours', S.hours.length > 0],
  ].map(([k, done]) => ({ k, done }));

  return {
    settingsOk, practical, staffById, dresses, monthly: rows, villa, housingShare, checklist,
    totals: { sales: tot.sales, cost: tot.cost, gross: tot.sales - tot.cost },
    avgSuggested: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
    avgDays: dayList.length ? dayList.reduce((a, b) => a + b, 0) / dayList.length : null,
  };
}

if (typeof module !== 'undefined') module.exports = { compute, defaults, num, has, monthOf, r2, staffCost, DEPTS };
