// ZATCA Fatoora Phase 2 stub - integrate signing + submission here.
// Phase 1: generate QR + hash. Phase 2: XAdES sign + submit to ZATCA portal.
const zatcaPayload = (invoice) => ({
  invoice_number: invoice.number,
  issue_date: new Date().toISOString(),
  seller_vat: invoice.seller_vat || '',
  gross: Number(invoice.gross_amount || 0),
  vat: Number(invoice.vat_amount || 0),
  net: Number(invoice.net_amount || 0),
});
module.exports = { zatcaPayload };
