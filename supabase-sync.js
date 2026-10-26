// ==============================================================================
// SUPABASE REALTIME SYNC ENGINE FOR DINESH HARDWARE POS & ERP
// Handles automatic database hydration on startup and persistence on actions.
// ==============================================================================

async function dbLoadAll() {
  if (!window.dbClient) {
    console.warn('Supabase client not initialized.');
    return;
  }

  try {
    // 1. Load Products & Inventory
    const { data: prods, error: pErr } = await dbClient.from('products').select('*');
    if (!pErr && prods && prods.length > 0) {
      inventoryData = prods.map(p => ({
        id: p.id,
        name: p.name,
        cat: p.cat || 'General',
        sku: p.sku || '',
        unit: p.unit || 'Pcs',
        msp: parseFloat(p.msp) || 0,
        price: parseFloat(p.price) || 0,
        stock: parseFloat(p.stock) || 0,
        showroom: parseFloat(p.showroom) || 0,
        godown: parseFloat(p.godown) || 0,
        batches: Array.isArray(p.batches) ? p.batches : []
      }));
      invoiceCatalog = inventoryData.map(i => ({
        name: i.name,
        sku: i.sku,
        price: i.price,
        desc: `${i.name} (${i.unit})`
      }));
      renderInventory();
    }

    // 2. Load Customers
    const { data: custs, error: cErr } = await dbClient.from('customers').select('*');
    if (!cErr && custs && custs.length > 0) {
      customerCreditList = custs.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        email: c.email || '',
        balance: parseFloat(c.balance) || 0,
        lastBill: c.last_bill || ''
      }));
      renderCustomers();
      syncCustomerSelects();
    }

    // 3. Load Suppliers
    const { data: sups, error: sErr } = await dbClient.from('suppliers').select('*');
    if (!sErr && sups && sups.length > 0) {
      suppliersList = sups.map(s => ({
        id: s.id,
        name: s.name,
        company: s.company || '',
        phone: s.phone || '',
        email: s.email || '',
        bank: s.bank || '',
        balance: parseFloat(s.balance) || 0
      }));
      renderSuppliers();
      syncSupplierSelects();
    }

    // 4. Load Sales Invoices
    const { data: sales, error: saErr } = await dbClient.from('sales_invoices').select('*').order('created_at', { ascending: false });
    if (!saErr && sales && sales.length > 0) {
      salesHistoryList = sales.map(s => ({
        id: s.id,
        inv: s.inv_no,
        date: s.invoice_date ? new Date(s.invoice_date).toLocaleDateString() : 'Recent',
        customer: s.customer_name || 'Walk-in Customer',
        items: s.items_summary || (Array.isArray(s.items) ? s.items.map(i => i.name || i.productName).join(', ') : ''),
        total: parseFloat(s.total) || 0,
        mode: s.mode || 'Cash',
        returned: !!s.returned
      }));
      renderSalesHistory();
    }

    // 5. Load GRN Bills
    const { data: grns, error: gErr } = await dbClient.from('grn_bills').select('*').order('created_at', { ascending: false });
    if (!gErr && grns && grns.length > 0) {
      grnHistoryRecords = grns.map(g => ({
        id: g.id,
        grnNo: g.bill_no,
        billNo: g.bill_no,
        date: g.bill_date || 'Recent',
        supplier: g.supplier_name,
        itemsSummary: g.items_summary,
        items: Array.isArray(g.items) ? g.items : [],
        total: parseFloat(g.total) || 0,
        status: 'In Stock'
      }));
      renderGrnHistory();
    }

    // 6. Load Quotations
    const { data: quotes, error: qErr } = await dbClient.from('quotations').select('*').order('created_at', { ascending: false });
    if (!qErr && quotes && quotes.length > 0) {
      quotationsList = quotes.map(q => ({
        id: q.id,
        ref: q.quote_no,
        date: q.quote_date || 'Recent',
        customer: q.customer_name,
        itemsSummary: Array.isArray(q.items) ? q.items.map(i => i.productName).join(', ') : '',
        total: parseFloat(q.total) || 0,
        status: q.status || 'Pending'
      }));
      renderQuotationsList();
    }

    // 7. Load Credit Notes
    const { data: cns, error: cnErr } = await dbClient.from('credit_notes').select('*').order('created_at', { ascending: false });
    if (!cnErr && cns && cns.length > 0) {
      creditNotesList = cns.map(c => ({
        id: c.id,
        cnNo: c.cn_no,
        date: c.cn_date ? new Date(c.cn_date).toLocaleDateString() : 'Recent',
        customer: c.customer_name,
        itemsSummary: c.items_summary,
        total: parseFloat(c.total) || 0,
        status: c.status || 'Applied to Ledger'
      }));
      renderPastCreditNotesList();
    }

    // 8. Load Supplier Credits
    const { data: scs, error: scErr } = await dbClient.from('supplier_credits').select('*').order('created_at', { ascending: false });
    if (!scErr && scs && scs.length > 0) {
      supplierCreditsList = scs.map(s => ({
        id: s.id,
        scNo: s.sc_no,
        date: s.sc_date ? new Date(s.sc_date).toLocaleDateString() : 'Recent',
        supplier: s.supplier_name,
        ref: s.ref_no || '',
        itemsSummary: s.items_summary,
        total: parseFloat(s.total) || 0,
        status: s.status || 'Deducted from Payable'
      }));
      renderPastSupplierCreditsList();
    }

    // 9. Load PDC Cheques
    const { data: chqs, error: chErr } = await dbClient.from('pdc_cheques').select('*').order('due_date', { ascending: true });
    if (!chErr && chqs && chqs.length > 0) {
      pdcChequesList = chqs.map(c => ({
        id: c.id,
        chqNo: c.chq_no,
        party: c.party,
        type: c.type,
        bank: c.bank || '',
        amount: parseFloat(c.amount) || 0,
        dueDate: c.due_date,
        status: c.status || 'Pending'
      }));
      renderPdcCheques();
    }

    console.log('✅ Supabase database synchronized successfully!');
  } catch (err) {
    console.error('Error synchronizing with Supabase:', err);
  }
}

// ==================== PERSISTENCE HELPERS ====================

async function dbInsertProduct(product) {
  if (!window.dbClient) return;
  try {
    const { data, error } = await dbClient.from('products').insert([{
      name: product.name,
      cat: product.cat || 'General',
      sku: product.sku || '',
      unit: product.unit || 'Pcs',
      msp: parseFloat(product.msp) || 0,
      price: parseFloat(product.price) || 0,
      stock: parseFloat(product.stock) || 0,
      showroom: parseFloat(product.showroom) || 0,
      godown: parseFloat(product.godown) || 0,
      batches: product.batches || []
    }]).select();
    if (error) console.error('Error inserting product to Supabase:', error);
    return data;
  } catch (err) { console.error(err); }
}

async function dbUpdateProduct(productName, updates) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('products').update(updates).eq('name', productName);
    if (error) console.error('Error updating product in Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertCustomer(customer) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('customers').insert([{
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      email: customer.email || '',
      balance: parseFloat(customer.balance) || 0,
      last_bill: customer.lastBill || ''
    }]);
    if (error) console.error('Error inserting customer to Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbUpdateCustomerBalance(customerName, newBalance, lastBill) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('customers').update({
      balance: newBalance,
      last_bill: lastBill
    }).eq('name', customerName);
    if (error) console.error('Error updating customer balance:', error);
  } catch (err) { console.error(err); }
}

async function dbUpdateSupplierBalance(supplierName, newBalance) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('suppliers').update({
      balance: newBalance
    }).eq('name', supplierName);
    if (error) console.error('Error updating supplier balance:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertSupplier(supplier) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('suppliers').insert([{
      name: supplier.name,
      company: supplier.company || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      bank: supplier.bank || '',
      balance: parseFloat(supplier.balance) || 0
    }]);
    if (error) console.error('Error inserting supplier to Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertSaleInvoice(sale) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('sales_invoices').insert([{
      inv_no: sale.inv,
      customer_name: sale.customer,
      items: sale.itemsRaw || [],
      items_summary: sale.items,
      total: sale.total,
      mode: sale.mode,
      returned: !!sale.returned
    }]);
    if (error) console.error('Error inserting sale to Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertGrnBill(bill) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('grn_bills').insert([{
      bill_no: bill.billNo || bill.grnNo,
      supplier_name: bill.supplier,
      items: bill.items || [],
      items_summary: bill.itemsSummary || '',
      total: bill.total || 0
    }]);
    if (error) console.error('Error inserting GRN to Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertQuotation(quote) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('quotations').insert([{
      quote_no: quote.ref,
      customer_name: quote.customer,
      items: quote.items || [],
      total: quote.total,
      status: quote.status || 'Pending'
    }]);
    if (error) console.error('Error inserting quotation to Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertCreditNote(cn) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('credit_notes').insert([{
      cn_no: cn.cnNo,
      customer_name: cn.customer,
      email: cn.email || '',
      address: cn.address || '',
      items: cn.items || [],
      items_summary: cn.itemsSummary || '',
      total: cn.total,
      status: cn.status || 'Applied to Ledger'
    }]);
    if (error) console.error('Error inserting credit note to Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertSupplierCredit(sc) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('supplier_credits').insert([{
      sc_no: sc.scNo,
      supplier_name: sc.supplier,
      ref_no: sc.ref || '',
      items: sc.items || [],
      items_summary: sc.itemsSummary || '',
      total: sc.total,
      status: sc.status || 'Deducted from Payable'
    }]);
    if (error) console.error('Error inserting supplier credit to Supabase:', error);
  } catch (err) { console.error(err); }
}

async function dbInsertCheque(chq) {
  if (!window.dbClient) return;
  try {
    const { error } = await dbClient.from('pdc_cheques').insert([{
      chq_no: chq.chqNo,
      party: chq.party || chq.supplier || chq.customer || '',
      type: chq.type || 'Outgoing',
      bank: chq.bank || '',
      amount: parseFloat(chq.amount) || 0,
      due_date: chq.dueDate || new Date().toISOString().split('T')[0],
      status: chq.status || 'Pending'
    }]);
    if (error) console.error('Error inserting cheque to Supabase:', error);
  } catch (err) { console.error(err); }
}
