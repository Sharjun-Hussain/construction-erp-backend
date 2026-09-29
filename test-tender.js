const B = 'http://localhost:5000/api/v1';
let H = {};
const api = async (m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...H }, body: b ? JSON.stringify(b) : undefined });
  let j = null;
  try { j = await r.json(); } catch { j = {}; }
  return { http: r.status, ...j };
};
(async () => {
  const SFX = String(Date.now()).slice(-5);
  const l = await api('POST', '/auth/login', { email: 'admin@qulf.sa', password: 'Admin@123' });
  H = { Authorization: 'Bearer ' + l.data.access_token };
  const proj = (await api('GET', '/projects?limit=1&status=Draft')).data?.[0]
    || (await api('GET', '/projects?limit=5')).data.find((p) => p.status === 'Draft')
    || (await api('GET', '/projects?limit=1')).data[0];
  const pid = proj.id;
  const est = await api('POST', '/estimations', {
    project_id: pid, number: 'EST-T' + SFX, material_cost: 300000, labor_cost: 120000,
    equipment_cost: 80000, overhead_pct: 10, margin_pct: 18,
  });
  console.log('1. estimation:', est.http, 'cost:', est.data?.total_cost, 'sell:', est.data?.sell_total);
  const eid = est.data.id;
  await api('POST', `/estimations/${eid}/items`, { description: 'Substructure concrete', unit: 'M3', quantity: 1200, unit_cost: 300, unit_sell: 372 });
  await api('POST', `/estimations/${eid}/items`, { description: 'Blockwork', unit: 'M2', quantity: 4500, unit_cost: 55, unit_sell: 68 });

  const in3 = new Date(); in3.setDate(in3.getDate() + 3);
  const in75 = new Date(); in75.setDate(in75.getDate() + 75);
  const TN = 'TND-' + SFX;
  const t = await api('POST', '/tenders', {
    project_id: pid, estimation_id: eid, number: TN, reference: 'MOMRA/2026/' + SFX,
    title: 'King Saud Road Expansion', consultant_name: 'Dar Al Handasah',
    contract_type: 'LumpSum', tender_type: 'Open', currency: 'SAR',
    issue_date: new Date().toISOString().slice(0, 10), submission_deadline: in3.toISOString().slice(0, 10),
    validity_date: in75.toISOString().slice(0, 10), bid_amount: 1000000,
    bond_type: 'Bank Guarantee', bond_amount: 50000, bond_expiry: in75.toISOString().slice(0, 10), bond_status: 'Issued',
    contingency_pct: 5, escalation_pct: 2, probability: 65,
  });
  const tid = t.data.id;
  console.log('2. tender created:', t.http, '| project auto-status:', (await api('GET', '/projects/' + pid)).data?.status, '| margin:', t.data?.margin_pct);

  const searchRes = await api('GET', '/tenders?search=' + TN);
  const dl = searchRes.data?.[0];
  console.log('3. search+deadline countdown:', searchRes.http, 'rows:', searchRes.data?.length, JSON.stringify(dl?.deadline));

  const a1 = await api('POST', `/tenders/${tid}/addenda`, { type: 'Clarification', subject: 'Subbase compaction spec', body: 'Request clarification on subbase density requirement.' });
  await api('POST', `/tenders/${tid}/addenda`, { type: 'Addendum', subject: 'Drawing revision C', body: 'Structural drawings superseded by Rev C.', issued_date: new Date().toISOString().slice(0, 10) });
  const ans = await api('PUT', `/tenders/${tid}/addenda/${a1.data.id}/answer`, { response: 'Minimum 100% MDD per AASHTO T180.' });
  console.log('4. addenda:', (await api('GET', `/tenders/${tid}/addenda`)).data.length, '| answered:', ans.data?.status);

  const sub = await api('POST', `/tenders/${tid}/submit`);
  console.log('5. submitted + baseline frozen:', sub.http, '| lines:', sub.data?.lines, '| cost:', sub.data?.cost_amount, '| margin%:', sub.data?.margin_pct);
  const lockedEdit = await api('PUT', `/tenders/${tid}`, { bid_amount: 9999999 });
  console.log('6. edit locked after submit:', lockedEdit.message);
  const reSubmit = await api('POST', `/tenders/${tid}/submit`);
  console.log('7. re-submit blocked:', reSubmit.message);

  const ca = await api('GET', `/tenders/${tid}/cost-analysis`);
  console.log('8. cost analysis:', ca.http, 'lines:', ca.data?.lines?.length, '| summary:', JSON.stringify(ca.data?.summary));

  const past = new Date(); past.setDate(past.getDate() - 1);
  const t2 = await api('POST', '/tenders', { project_id: pid, number: 'TND-P' + SFX, title: 'Expired tender', bid_amount: 1000, submission_deadline: past.toISOString().slice(0, 10) });
  const blocked = await api('POST', `/tenders/${t2.data.id}/submit`);
  console.log('9. past-deadline submit blocked:', blocked.message);

  const noReason = await api('POST', `/tenders/${tid}/decision`, { status: 'Lost' });
  console.log('10. lost without reason blocked:', noReason.message);
  const won = await api('POST', `/tenders/${tid}/decision`, { status: 'Won' });
  const pAfter = await api('GET', '/projects/' + pid);
  console.log('11. won:', won.http, '| project:', pAfter.data?.status, '| contract_value:', pAfter.data?.contract_value, '| contract_no:', pAfter.data?.contract_no);

  const conv = await api('POST', `/tenders/${tid}/convert`, {});
  console.log('12. convert:', conv.http, conv.message, '| boq:', conv.data?.boq?.number, '| lines:', conv.data?.lines);
  const dup = await api('POST', `/tenders/${tid}/convert`, {});
  console.log('13. double-convert blocked:', dup.message);
  const boqLines = (await api('GET', `/boqs/${conv.data.boq.id}`)).data.items;
  console.log('14. awarded BOQ lines:', boqLines.length, '| first:', boqLines[0]?.description, boqLines[0]?.quantity, 'x', boqLines[0]?.unit_rate, '=', boqLines[0]?.amount);

  const an = await api('GET', '/tenders/analytics');
  console.log('15. analytics totals:', JSON.stringify(an.data?.totals));
  console.log('16. variances:', JSON.stringify(an.data?.variances));
  console.log('17. bonds tracked:', an.data?.bonds?.length);
  console.log('18. pipeline top:', JSON.stringify(an.data?.pipeline?.slice(0, 2)));

  const hist = (await api('GET', `/tenders/${tid}/history`)).data;
  console.log('19. history:', [...new Set(hist.map((h) => h.action))].join(', '));
  const del = await api('DELETE', '/tenders/' + t2.data.id);
  console.log('20. draft delete:', del.http, '| submitted delete blocked:', (await api('DELETE', '/tenders/' + tid)).message);

  const x = await fetch(B + `/tenders/${tid}/export`, { headers: H });
  console.log('21. xlsx export:', x.status, x.headers.get('content-type')?.slice(0, 46));
})().catch((e) => { console.error('fail:', e.message); process.exit(1); });
