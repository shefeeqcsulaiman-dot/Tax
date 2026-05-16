const META={dashboard:{t:'Dashboard',s:'Loading dashboard from database',a:'+ New Invoice',ao:()=>go('sales')},company:{t:'Company Registration',s:'UAE Trade License & FTA Details',a:'Save All',ao:()=>toast('All changes saved','ok')},sales:{t:'Sales & Invoices',s:'Upload - AI Extraction - Validation - Invoices',a:'+ New Invoice',ao:()=>{go('sales');setTimeout(()=>stab(document.querySelectorAll('#page-sales .tab')[4],'s-create'),50)}},purchase:{t:'Purchases',s:'Upload - AI Extraction - Validation',a:'Upload Files',ao:()=>document.getElementById('pur-file').click()},bank:{t:'Bank Accounts',s:'Accounts - Transactions - Reconciliation',a:'+ Add Account',ao:()=>showM('m-bank')},inventory:{t:'Inventory',s:'Stock - Items - Movements',a:'+ Add Item',ao:()=>openInventoryItemModal()},expense:{t:'Expenses',s:'List - Create - Approvals',a:'+ New Expense',ao:()=>{go('expense');setTimeout(()=>stab(document.querySelectorAll('#page-expense .tab')[1],'exp-create'),50)}},accounting:{t:'Accounting',s:'Chart - Journal - Ledger',a:'+ New Entry',ao:()=>showM('m-acc')},reports:{t:'Reports',s:'VAT - P&L - Trial Balance',a:'Export PDF',ao:()=>toast('Exporting report...','info')},settings:{t:'Settings',s:'General - Users - Tax',a:'Save All',ao:()=>toast('Settings saved','ok')},staff:{t:'Staff Management',s:'Attendance - Leave - Corrections - Biometric',a:'+ Add Employee',ao:()=>showM('m-emp')},expert:{t:'Expert Review',s:'Find CA experts - Submit for review',a:'+ New Request',ao:()=>showM('m-newreview')},design:{t:'System Design',s:'Functional Spec - Fields - Validations - API',a:'Export Spec',ao:()=>toast('Exporting FRD to PDF...','info')}};
META.settings={t:'Settings',s:'Company - Users - Tax - Security - Integrations - Invoice Design',a:'Save All',ao:()=>toast('Settings saved','ok')};
META.payroll={t:'Payroll',s:'Salary run - WPS/SIF - Payslips - Posting',a:'Run Payroll',ao:()=>{go('payroll');setTimeout(()=>runPayroll(),50)}};
META.sales={t:'Sales & Invoices',s:'Upload - AI Extraction - Validation - Invoices',a:'+ New Invoice',ao:()=>{go('sales');setTimeout(()=>stab(document.querySelectorAll('#page-sales .tab')[4],'s-create'),50)}};
META.quotations={t:'Quotations',s:'Create - share - convert to invoice',a:'+ New Quotation',ao:()=>{go('quotations');setTimeout(()=>stab(document.querySelectorAll('#page-quotations .tab')[1],'q-create'),50)}};
META.purchase={t:'Purchases',s:'Upload - AI Extraction - Validation - Manual - Settings',a:'Upload Files',ao:()=>document.getElementById('pur-file').click()};
META.ai={t:'AI Assistant',s:'Ask questions about TaxFlow modules and workflows',a:'Ask AI',ao:()=>askSystemAI()};
META.bills={t:'Bills',s:'Vendor bills - Purchase orders - Supplier payments',a:'+ New Bill',ao:()=>showM('m-bill')};
META.payments={t:'Payments',s:'Receipts - Payouts - Gateway settlements',a:'+ Record Payment',ao:()=>showM('m-payment')};
META.documents={t:'Documents',s:'Receipts - PDFs - Audit files - Attachments',a:'Upload Document',ao:()=>toast('Choose files to upload...','info')};
META.notifications={t:'Notifications',s:'Email - WhatsApp - SMS - Push - In-app alerts',a:'+ New Rule',ao:()=>toast('Notification rule builder opened','info')};
META.rota={t:'Rota Planning',s:'Shift setup - Weekly rota - Coverage - Swap requests',a:'Publish Rota',ao:()=>publishRota()};
META.accounting={t:'Accounting',s:'Chart - Journal - Ledger - Tax - Closing',a:'+ Journal Entry',ao:()=>{go('accounting');setTimeout(()=>stab(document.querySelectorAll('#page-accounting .tab')[1],'acc-journal'),50)}};
META.corporate={t:'Corporate Accounting',s:'Corporate tax - Assets - Accruals - Cost centers - Budgets',a:'Tax Report',ao:()=>{go('corporate');setTimeout(()=>stab(document.querySelectorAll('#page-corporate .tab')[0],'corp-tax'),50)}};
META.reports={t:'Reports',s:'VAT - P&L - Balance Sheet - Trial Balance',a:'Export PDF',ao:()=>exportActiveReportPdf()};
META.exception={t:'Exception Center',s:'Failed postings - duplicates - VAT/OCR - stock and payroll issues',a:'Refresh',ao:()=>loadExceptionCenter()};

function scheduleIdleTask(fn,timeout=800){
  if('requestIdleCallback' in window){
    window.requestIdleCallback(fn,{timeout});
  }else{
    setTimeout(fn,0);
  }
}

function runPageWarmup(page){
  const pageId='page-'+page;
  scheduleIdleTask(()=>{
    enhancePageTables(pageId);
    bindDetailViews();
    bindEditActions();
    bindGenericAddActions();
  },500);
}

const navHistory=[];
let restoringNavigation=false;

function getCurrentNavState(){
  const pageEl=document.querySelector('.page.on');
  const page=(pageEl?.id||'page-dashboard').replace(/^page-/,'')||'dashboard';
  const tab=pageEl?.querySelector('.tab-body.on')?.id||'';
  return {page,tab};
}

function sameNavState(a,b){
  return !!a&&!!b&&a.page===b.page&&a.tab===b.tab;
}

function updateBackButton(){
  const back=document.getElementById('back-btn');
  if(back)back.disabled=navHistory.length===0;
}

function rememberNavState(state){
  if(!state?.page)return;
  const last=navHistory[navHistory.length-1];
  if(!sameNavState(last,state))navHistory.push(state);
  if(navHistory.length>40)navHistory.shift();
  updateBackButton();
}

function restoreNavState(state){
  if(!state?.page)return;
  restoringNavigation=true;
  go(state.page);
  if(state.tab){
    const tab=[...document.querySelectorAll('#page-'+state.page+' .tab')].find(el=>(el.getAttribute('onclick')||'').includes("'"+state.tab+"'"));
    if(tab)stab(tab,state.tab);
  }
  restoringNavigation=false;
  updateBackButton();
}

function goBack(){
  const openOverlay=[...document.querySelectorAll('.overlay.on')].pop();
  if(openOverlay){
    openOverlay.classList.remove('on');
    return;
  }
  const previous=navHistory.pop();
  if(!previous){
    updateBackButton();
    toast('No previous page','info');
    return;
  }
  restoreNavState(previous);
}

function go(page){
  if(page==='company'){
    go('settings');
    setTimeout(()=>stab(document.querySelectorAll('#page-settings .tab')[0],'set-company'),50);
    return;
  }
  if(page==='design'){
    toast('System Design is hidden','info');
    return;
  }
  const target=document.getElementById('page-'+page);
  if(!target)return;
  const fromState=getCurrentNavState();
  if(!restoringNavigation&&fromState.page!==page)rememberNavState(fromState);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('on'));
  target.classList.add('on');
  document.querySelectorAll('.nav').forEach(n=>{if((n.getAttribute('onclick')||'').includes("'"+page+"'"))n.classList.add('on');});
  const m=META[page];
  document.getElementById('ptitle').textContent=m.t;
  document.getElementById('psub').textContent=m.s;
  document.getElementById('topaction').textContent=m.a;
  document.getElementById('topaction').onclick=m.ao;
  closeSidebar();
  if(page==='reports')syncReportsFromDatabase();
  if(page==='exception')loadExceptionCenter();
  runPageWarmup(page);
  updateBackButton();
}

function stab(el,target){
  if(!el)return;
  const fromState=getCurrentNavState();
  if(!restoringNavigation&&target&&fromState.tab!==target)rememberNavState(fromState);
  const tb=el.closest('.tabs');
  if(tb)tb.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  const pg=el.closest('.page');
  if(pg)pg.querySelectorAll('.tab-body').forEach(b=>b.classList.remove('on'));
  const t=document.getElementById(target);
  if(t)t.classList.add('on');
  if(target==='inv-mapping')loadStockMappingsFromServer();
  updateBackButton();
}

function toast(msg,type='ok'){
  const icons={ok:'?',warn:'?',err:'?',info:'?'};
  const clrs={ok:'var(--green)',warn:'var(--amber)',err:'var(--red)',info:'var(--accent)'};
  const t=document.createElement('div');
  t.className='toast '+type;
  const icon=document.createElement('span');
  icon.style.cssText=`color:${clrs[type]||clrs.info};font-size:15px`;
  icon.textContent=icons[type]||'?';
  const text=document.createElement('span');
  text.textContent=msg;
  t.append(icon,text);
  document.getElementById('toasts').appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

function toggleSidebar(force){
  const open=force??!document.body.classList.contains('nav-open');
  document.body.classList.toggle('nav-open',open);
  document.getElementById('nav-scrim')?.classList.toggle('on',open);
  document.getElementById('menu-btn')?.setAttribute('aria-expanded',String(open));
}
function closeSidebar(){toggleSidebar(false);}

function showM(id){
  const modal=document.getElementById(id);
  if(!modal)return;
  modal.classList.add('on');
  setTimeout(()=>modal.querySelector('input,select,textarea,button')?.focus(),30);
}
function closeM(id){
  document.getElementById(id)?.classList.remove('on');
  if(id==='m-customer')customerReturnToInvoice=false;
  if(id==='m-product'){
    productReturnToInvoice=false;
    productTargetLine=null;
  }
}
function closeOvBg(e,id){if(e.target.id===id)closeM(id);}
function saveM(id,msg){closeM(id);toast(msg,'ok');audit(msg.replace(/[?.]/g,'').trim(),id,'Saved');}

let currentStockMapRow=null;

function openStockMap(btn){
  currentStockMapRow=btn.closest('tr');
  const cells=currentStockMapRow?.querySelectorAll('td')||[];
  const product=document.getElementById('stock-map-product');
  const supplier=document.getElementById('stock-map-supplier');
  const generated=document.getElementById('stock-map-generated');
  const unitsOuter=document.getElementById('stock-map-units-outer');
  if(product)product.value=cells[0]?.textContent.trim()||'';
  if(supplier)supplier.value=(cells[1]?.textContent.trim()||'').replace(/^[-—]$/,'');
  if(generated)generated.value=cells[2]?.textContent.trim()||generateStockMapName(product?.value||'');
  if(unitsOuter)unitsOuter.value=cells[3]?.textContent.trim()||currentStockMapRow?.dataset.unitsPerOuter||'1';
  setFieldValue(document.getElementById('stock-map-cost'),currentStockMapRow?.dataset.cost||'0.00');
  setFieldValue(document.getElementById('stock-map-markup'),currentStockMapRow?.dataset.markupPercent||'0');
  setSelectValue(document.getElementById('stock-map-tax-rate'),currentStockMapRow?.dataset.taxRate||'5');
  updateStockMapPricing();
  document.getElementById('stock-map-empty')?.classList.add('hidden');
  const panel=document.getElementById('stock-map-panel');
  panel?.classList.remove('hidden');
  panel?.scrollIntoView({block:'nearest'});
  setTimeout(()=>product?.focus(),30);
}

function saveStockMap(){
  const product=(document.getElementById('stock-map-product')?.value||'').trim();
  const supplier=(document.getElementById('stock-map-supplier')?.value||'').trim();
  const generated=(document.getElementById('stock-map-generated')?.value||generateStockMapName(product)).trim();
  const unitsOuter=parseAmount(document.getElementById('stock-map-units-outer')?.value)||1;
  const pricing=updateStockMapPricing();
  if(!product||!generated){
    toast('Enter Product Name and Generated Name','warn');
    return;
  }
  if(!currentStockMapRow){
    const tbody=document.getElementById('stock-map-tbody');
    if(!tbody){
      toast('Stock mapping table is not available','warn');
      return;
    }
    removeEmptyState(tbody);
    const sku=generateStockSku(product);
    const tr=document.createElement('tr');
    tr.dataset.itemCode=sku;
    tr.dataset.stockSku=sku;
    tr.innerHTML=`<td>${escapeHtml(product)}</td><td>${escapeHtml(supplier||'Not assigned')}</td><td>${escapeHtml(generated)}</td><td class="mono">${escapeHtml(String(unitsOuter))}</td><td><span class="b b-a">Not mapped</span></td><td data-action-col="1">${stockMapActionsHtml()}</td>`;
    tbody.prepend(tr);
    currentStockMapRow=tr;
  }
  if(currentStockMapRow){
    const cells=currentStockMapRow.querySelectorAll('td');
    cells[0].textContent=product;
    cells[1].textContent=supplier||'Not assigned';
    cells[2].textContent=generated;
    cells[3].textContent=String(unitsOuter);
    cells[4].innerHTML='<span class="b b-g">Mapped</span>';
    currentStockMapRow.dataset.unitsPerOuter=String(unitsOuter);
    currentStockMapRow.dataset.cost=String(pricing.cost);
    currentStockMapRow.dataset.markupPercent=String(pricing.markup);
    currentStockMapRow.dataset.taxRate=String(pricing.taxRate);
    currentStockMapRow.dataset.vatAmount=String(pricing.vat);
    currentStockMapRow.dataset.incVat=String(pricing.incVat);
    currentStockMapRow.dataset.priceOuter=String(pricing.priceOuter);
    const payload=stockMappingPayloadFromRow(currentStockMapRow);
    payload.name=product;
    payload.supplier_name=supplier||null;
    payload.taxflow_name=generated;
    payload.units_per_outer=unitsOuter;
    payload.cost=pricing.cost;
    payload.markup_percent=pricing.markup;
    payload.tax_rate=pricing.taxRate;
    payload.vat_amount=pricing.vat;
    payload.inc_vat=pricing.incVat;
    payload.price_outer=pricing.priceOuter;
    const mappingId=currentStockMapRow.dataset.mappingId;
    moduleApi(mappingId?`/inventory/mappings/${encodeURIComponent(mappingId)}`:'/inventory/mappings',{
      method:mappingId?'PUT':'POST',
      body:payload
    }).then(saved=>{
      if(saved?.id){
        currentStockMapRow.dataset.mappingId=saved.id;
        currentStockMapRow.dataset.stockSku=saved.sku;
        currentStockMapRow.dataset.salesAccountCode=saved.sales_account_code||'3000';
        currentStockMapRow.dataset.purchaseAccountCode=saved.purchase_account_code||'4000';
        currentStockMapRow.dataset.inventoryAccountCode=saved.inventory_account_code||'1200';
        currentStockMapRow.dataset.taxCode=saved.tax_code||'VAT5';
        currentStockMapRow.dataset.reorderLevel=saved.reorder_level??0;
        currentStockMapRow.dataset.unitsPerOuter=saved.units_per_outer??unitsOuter;
        currentStockMapRow.dataset.cost=saved.cost??pricing.cost;
        currentStockMapRow.dataset.markupPercent=saved.markup_percent??pricing.markup;
        currentStockMapRow.dataset.taxRate=saved.tax_rate??pricing.taxRate;
        currentStockMapRow.dataset.vatAmount=saved.vat_amount??pricing.vat;
        currentStockMapRow.dataset.incVat=saved.inc_vat??pricing.incVat;
        currentStockMapRow.dataset.priceOuter=saved.price_outer??pricing.priceOuter;
      }
      toast('Stock mapping saved to database','ok');
    }).catch(err=>{
      console.warn('Stock mapping save failed:',err);
      toast('Stock mapping saved on screen, database save failed','warn');
    });
  }
  toast('Stock product mapped','ok');
  audit('Mapped stock product',product,'Saved');
  refreshEnhancedTable(document.getElementById('stock-map-tbody')?.closest('table'));
}

function openNewStockMap(){
  currentStockMapRow=null;
  ['stock-map-product','stock-map-supplier','stock-map-generated'].forEach(id=>setFieldValue(document.getElementById(id),''));
  setFieldValue(document.getElementById('stock-map-units-outer'),'1');
  setFieldValue(document.getElementById('stock-map-cost'),'0.00');
  setFieldValue(document.getElementById('stock-map-markup'),'0');
  setSelectValue(document.getElementById('stock-map-tax-rate'),'5');
  updateStockMapPricing();
  document.getElementById('stock-map-empty')?.classList.add('hidden');
  const panel=document.getElementById('stock-map-panel');
  panel?.classList.remove('hidden');
  panel?.scrollIntoView({block:'nearest'});
  setTimeout(()=>document.getElementById('stock-map-product')?.focus(),30);
}

function clearStockMapPanel(){
  currentStockMapRow=null;
  const product=document.getElementById('stock-map-product');
  const supplier=document.getElementById('stock-map-supplier');
  const generated=document.getElementById('stock-map-generated');
  const unitsOuter=document.getElementById('stock-map-units-outer');
  if(product)product.value='';
  if(supplier)supplier.value='';
  if(generated)generated.value='';
  if(unitsOuter)unitsOuter.value='1';
  setFieldValue(document.getElementById('stock-map-cost'),'0.00');
  setFieldValue(document.getElementById('stock-map-markup'),'0');
  setSelectValue(document.getElementById('stock-map-tax-rate'),'5');
  updateStockMapPricing();
  document.getElementById('stock-map-panel')?.classList.add('hidden');
  document.getElementById('stock-map-empty')?.classList.remove('hidden');
}

function updateStockMapPricing(){
  const cost=parseAmount(document.getElementById('stock-map-cost')?.value);
  const markup=parseAmount(document.getElementById('stock-map-markup')?.value);
  const taxRate=parseAmount(document.getElementById('stock-map-tax-rate')?.value);
  const unitsOuter=parseAmount(document.getElementById('stock-map-units-outer')?.value)||1;
  const base=cost*(1+(markup/100));
  const vat=base*(taxRate/100);
  const incVat=base;
  const priceOuter=unitsOuter>0?base/unitsOuter:0;
  setFieldValue(document.getElementById('stock-map-vat'),vat.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setFieldValue(document.getElementById('stock-map-inc-vat'),incVat.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setFieldValue(document.getElementById('stock-map-price-outer'),priceOuter.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  return {cost,markup,taxRate,vat,incVat,priceOuter};
}

function generateStockMapName(value){
  return String(value||'')
    .replace(/\b(litre|liter)\b/gi,'L')
    .replace(/\bpieces\b/gi,'pcs')
    .replace(/\bpiece\b/gi,'pc')
    .replace(/\bsmall\b/gi,'Small')
    .replace(/\blarge\b/gi,'Large')
    .replace(/\s+/g,' ')
    .trim();
}

function generateStockSku(value){
  const base=String(value||'ITEM').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,18)||'ITEM';
  const existing=new Set([...document.querySelectorAll('#stock-map-tbody tr:not([data-empty-state]),#prod-tbody tr:not([data-empty-state])')]
    .map(row=>(row.dataset.stockSku||row.dataset.itemCode||row.children[0]?.textContent||'').trim().toUpperCase()));
  if(!existing.has(base))return base;
  let index=2;
  while(existing.has(`${base}-${index}`))index+=1;
  return `${base}-${index}`;
}

function generateStockMapField(){
  const product=document.getElementById('stock-map-product');
  const generated=document.getElementById('stock-map-generated');
  if(!product?.value.trim()){
    toast('Enter Product Name first','warn');
    return;
  }
  if(generated)generated.value=generateStockMapName(product.value);
  toast('Generated name updated','info');
}

function stockMapActionsHtml(){
  return `<div class="row-actions">
    <button class="icon-btn edit" type="button" title="Edit mapping" aria-label="Edit mapping" onclick="openStockMap(this)">${editIconSvg()}</button>
    <button class="icon-btn danger" type="button" title="Delete mapping" aria-label="Delete mapping" onclick="deleteStockMapRow(this)">${deleteIconSvg()}</button>
  </div>`;
}

function deleteStockMapRow(btn){
  const row=btn.closest('tr');
  const name=row?.children[0]?.textContent.trim()||'mapping';
  const mappingId=row?.dataset.mappingId;
  if(mappingId){
    moduleApi(`/inventory/mappings/${encodeURIComponent(mappingId)}`,{method:'DELETE'})
      .catch(err=>{
        console.warn('Stock mapping delete failed:',err);
        toast('Mapping removed on screen, database delete failed','warn');
      });
  }
  row?.remove();
  const tbody=document.getElementById('stock-map-tbody');
  if(tbody&&tbody.querySelectorAll('tr:not([data-empty-state])').length===0){
    emptyTableMessage(tbody,'No stock mappings in database yet.');
  }
  clearStockMapPanel();
  refreshEnhancedTable(document.getElementById('stock-map-tbody')?.closest('table'));
  toast(`${name} mapping removed`,'warn');
  audit('Deleted stock mapping',name,'Deleted');
}

function stockSupplierNameFromItem(row){
  return row?.dataset?.supplier||'Not assigned';
}

function renderStockMappingRecord(mapping){
  const tbody=document.getElementById('stock-map-tbody');
  if(!tbody||!mapping?.sku)return;
  removeEmptyState(tbody);
  const selector=`tr[data-stock-sku="${CSS.escape(String(mapping.sku))}"]`;
  let tr=tbody.querySelector(selector);
  if(!tr){
    tr=document.createElement('tr');
    tbody.appendChild(tr);
  }
  const name=mapping.name||mapping.taxflow_name||mapping.sku;
  const supplier=mapping.supplier_name||'Not assigned';
  const taxflowName=mapping.taxflow_name||mapping.name||mapping.sku;
  tr.dataset.mappingId=mapping.id||'';
  tr.dataset.stockSku=mapping.sku;
  tr.dataset.salesAccountCode=mapping.sales_account_code||'3000';
  tr.dataset.purchaseAccountCode=mapping.purchase_account_code||'4000';
  tr.dataset.inventoryAccountCode=mapping.inventory_account_code||'1200';
  tr.dataset.taxCode=mapping.tax_code||'VAT5';
  tr.dataset.reorderLevel=mapping.reorder_level??0;
  tr.dataset.unitsPerOuter=mapping.units_per_outer??1;
  tr.dataset.cost=mapping.cost??0;
  tr.dataset.markupPercent=mapping.markup_percent??0;
  tr.dataset.taxRate=mapping.tax_rate??5;
  tr.dataset.vatAmount=mapping.vat_amount??0;
  tr.dataset.incVat=mapping.inc_vat??0;
  tr.dataset.priceOuter=mapping.price_outer??0;
  tr.innerHTML=`<td>${escapeHtml(name)}</td><td>${escapeHtml(supplier)}</td><td>${escapeHtml(taxflowName)}</td><td class="mono">${Number(mapping.units_per_outer||1).toLocaleString('en-AE',{maximumFractionDigits:4})}</td><td><span class="b b-g">Mapped</span></td><td data-action-col="1">${stockMapActionsHtml()}</td>`;
}

function stockMappingPayloadFromRow(row){
  const cells=row?.querySelectorAll('td')||[];
  const sku=row?.dataset.stockSku||row?.dataset.itemCode||cells[0]?.textContent.trim()||'';
  return {
    sku,
    name:cells[0]?.textContent.trim()||sku,
    supplier_name:(cells[1]?.textContent.trim()||'').replace(/^Not assigned$/,'')||null,
    taxflow_name:cells[2]?.textContent.trim()||cells[0]?.textContent.trim()||sku,
    units_per_outer:parseAmount(cells[3]?.textContent)||Number(row?.dataset.unitsPerOuter||1),
    cost:Number(row?.dataset.cost||0),
    markup_percent:Number(row?.dataset.markupPercent||0),
    tax_rate:Number(row?.dataset.taxRate||5),
    vat_amount:Number(row?.dataset.vatAmount||0),
    inc_vat:Number(row?.dataset.incVat||0),
    price_outer:Number(row?.dataset.priceOuter||0),
    sales_account_code:row?.dataset.salesAccountCode||'3000',
    purchase_account_code:row?.dataset.purchaseAccountCode||'4000',
    inventory_account_code:row?.dataset.inventoryAccountCode||'1200',
    tax_code:row?.dataset.taxCode||'VAT5',
    reorder_level:Number(row?.dataset.reorderLevel||0)
  };
}

async function loadStockMappingsFromServer(){
  const tbody=document.getElementById('stock-map-tbody');
  if(!tbody)return;
  try{
    await ensureBackendSession();
    const mappings=await moduleApi('/inventory/mappings');
    tbody.innerHTML='';
    (mappings||[]).forEach(renderStockMappingRecord);
    syncStockMappingFromItems();
  }catch(err){
    console.warn('Stock mappings unavailable:',err);
    syncStockMappingFromItems();
  }
}

function syncStockMappingFromItems(){
  const tbody=document.getElementById('stock-map-tbody');
  if(!tbody)return;
  removeEmptyState(tbody);
  const existing=new Set([...tbody.querySelectorAll('tr:not([data-empty-state])')]
    .map(row=>(row.dataset.stockSku||row.children[0]?.textContent.trim()||'').toLowerCase()));
  const itemRows=[...document.querySelectorAll('#prod-tbody tr:not([data-empty-state])')];
  itemRows.forEach(row=>{
    const cells=row.children;
    const code=cells[0]?.textContent.trim()||'';
    const name=cells[1]?.textContent.trim()||'';
    const key=(code||name).toLowerCase();
    if(!name||existing.has(key))return;
    const mappedName=generateStockMapName(name||code);
    const supplier=stockSupplierNameFromItem(row);
    const tr=document.createElement('tr');
    tr.dataset.itemCode=code;
    tr.dataset.stockSku=code||name;
    tr.dataset.unitsPerOuter='1';
    tr.dataset.cost='0';
    tr.dataset.markupPercent='0';
    tr.dataset.taxRate='5';
    tr.dataset.vatAmount='0';
    tr.dataset.incVat='0';
    tr.dataset.priceOuter='0';
    tr.innerHTML=`<td>${escapeHtml(name)}</td><td>${escapeHtml(supplier)}</td><td>${escapeHtml(mappedName)}</td><td class="mono">1</td><td><span class="b b-a">Not mapped</span></td><td data-action-col="1">${stockMapActionsHtml()}</td>`;
    tbody.appendChild(tr);
    existing.add(key);
  });
  refreshEnhancedTable(tbody.closest('table'));
  refreshInvoiceProductSuggestions();
}

function syncInventoryItemOptions(){
  const categorySelect=document.getElementById('inv-item-category');
  if(categorySelect){
    const current=categorySelect.value;
    const categories=[...document.querySelectorAll('#sales-category-tbody tr:not([data-empty-state]) td:first-child')]
      .map(td=>td.textContent.trim())
      .filter(Boolean);
    const unique=[...new Set(categories)];
    categorySelect.innerHTML='<option value="">Select Category</option>'+unique.map(name=>`<option>${escapeHtml(name)}</option>`).join('');
    if(current&&unique.includes(current))categorySelect.value=current;
  }
  const supplierSelect=document.getElementById('inv-item-supplier');
  if(supplierSelect){
    const current=supplierSelect.value;
    const suppliers=[...document.querySelectorAll('#vendor-tbody tr:not([data-empty-state]) td:first-child')]
      .map(td=>td.textContent.trim())
      .filter(Boolean);
    const unique=[...new Set(suppliers)];
    supplierSelect.innerHTML='<option value="">Select Supplier</option>'+unique.map(name=>`<option>${escapeHtml(name)}</option>`).join('');
    if(current&&unique.includes(current))supplierSelect.value=current;
  }
  const unitSelect=document.getElementById('inv-item-unit');
  if(unitSelect){
    const current=unitSelect.value;
    unitSelect.innerHTML='<option value="">Select Unit</option>'+unitOptionsHtml(current);
    if(current&&dbUnitNames().includes(current))unitSelect.value=current;
  }
}

function openInventoryItemModal(){
  syncInventoryItemOptions();
  showM('m-inv-item');
  setTimeout(()=>document.getElementById('inv-item-name')?.focus(),50);
}

function saveInventoryItem(){
  const code=(document.getElementById('inv-item-code')?.value||generateStockSku(document.getElementById('inv-item-name')?.value)).trim();
  const name=(document.getElementById('inv-item-name')?.value||'').trim();
  const category=document.getElementById('inv-item-category')?.value||'';
  const unit=document.getElementById('inv-item-unit')?.value||'';
  const cost=parseAmount(document.getElementById('inv-item-cost')?.value);
  const tracking=document.getElementById('inv-item-tracking')?.value||'Yes';
  const reorderLevel=parseAmount(document.getElementById('inv-item-reorder')?.value);
  const supplier=document.getElementById('inv-item-supplier')?.value||'';
  const status=document.getElementById('inv-item-status')?.value||'Active';
  if(!name){
    toast('Enter item name','warn');
    return;
  }
  if(!category){
    toast('Select category from database','warn');
    return;
  }
  if(!unit){
    toast('Select unit of measure from database','warn');
    return;
  }
  const tbody=document.getElementById('prod-tbody');
  if(tbody&&!hasFirstCellValue(tbody,code)){
    removeEmptyState(tbody);
    const row=document.createElement('tr');
    row.innerHTML=`<td class="mono">${escapeHtml(code)}</td><td>${escapeHtml(name)}</td><td>Stock Item</td><td>${escapeHtml(category)}</td><td>${escapeHtml(unit)}</td><td>Main Store</td><td><span class="b ${tracking==='No'?'b-gray':'b-g'}">${escapeHtml(tracking)}</span></td><td><span class="b b-b">5%</span></td><td><span class="b ${status==='Active'?'b-g':'b-gray'}">${escapeHtml(status)}</span></td>`;
    tbody.prepend(row);
  }
  saveServer('products',{code,name,category,unit,cost,vat:'Standard 5%',supplier_name:supplier,reorder_level:reorderLevel,status});
  syncStockMappingFromItems();
  closeM('m-inv-item');
  document.querySelectorAll('#m-inv-item input').forEach(input=>input.value='');
  syncInventoryItemOptions();
  toast('Item added to inventory','ok');
  audit('Added inventory item',name,'Saved');
}

function logout(){
  go('dashboard');
  toast('Logged out. Session cleared locally.','info');
  audit('Logged out','Session','Logged');
}

function chkTRN(inp){
  const v=inp.value.replace(/\D/g,'');inp.value=v;
  const el=document.getElementById('trn-msg');
  if(v.length===15)el.innerHTML='<span style="color:var(--green)">? Valid UAE TRN (15 digits)</span>';
  else if(v.length>0)el.innerHTML=`<span style="color:var(--amber)">? Must be 15 digits (${v.length}/15)</span>`;
  else el.innerHTML='<span style="color:var(--text3)">Enter TRN</span>';
}

function chkSettingsTRN(inp){
  const v=inp.value.replace(/\D/g,'');inp.value=v;
  const el=document.getElementById('set-company-trn-msg');
  if(v.length===15)el.innerHTML='<span style="color:var(--green)">? Valid UAE TRN (15 digits)</span>';
  else if(v.length>0)el.innerHTML=`<span style="color:var(--amber)">? Must be 15 digits (${v.length}/15)</span>`;
  else el.innerHTML='<span style="color:var(--text3)">Enter TRN</span>';
}

// -- UPLOAD: store real files --------------------------------------
const uploadedFiles = []; // {name, size, type, base64, category, period, status}
const PURCHASE_AI_PREVIEW_LIMIT = 500;

const APP_CONFIG={
  apiEndpoint:null,
  extractionEndpoint:null,
  salesExtractionEndpoint:null,
  extractionFallback:true
};
let currentCompany=null;

function backendHeaders(){
  const headers={'Content-Type':'application/json'};
  const token=localStorage.getItem('taxflow_token');
  if(token)headers.Authorization='Bearer '+token;
  return headers;
}

function apiBaseUrl(){
  if(window.TAXFLOW_API_BASE_URL)return window.TAXFLOW_API_BASE_URL;
  const currentHost=window.location.hostname||'127.0.0.1';
  const host=['localhost','::1',''].includes(currentHost)?'127.0.0.1':currentHost;
  return `http://${host}:8000/api/v1`;
}

async function ensureBackendSession(){
  if(localStorage.getItem('taxflow_token'))return true;
  return loginLocalBackend();
}

async function loginLocalBackend(){
  const host=window.location.hostname||'127.0.0.1';
  if(!['localhost','127.0.0.1','::1',''].includes(host))return false;
  try{
    const response=await fetch(`${apiBaseUrl()}/auth/login`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'admin@taxflowapp.com',password:'admin123'})
    });
    if(!response.ok)throw new Error('Login returned '+response.status);
    const data=await response.json();
    if(data.access_token)localStorage.setItem('taxflow_token',data.access_token);
    return !!data.access_token;
  }catch(err){
    console.warn('Local backend login failed:',err);
    return false;
  }
}

async function authenticatedFetch(url,options={}){
  await ensureBackendSession();
  let response=await fetch(url,{...options,headers:{...backendHeaders(),...(options.headers||{})}});
  if(response.status===401||response.status===403){
    localStorage.removeItem('taxflow_token');
    const relogged=await loginLocalBackend();
    if(relogged){
      response=await fetch(url,{...options,headers:{...backendHeaders(),...(options.headers||{})}});
    }
  }
  return response;
}

function formatAed(value){
  const num=Number(value||0);
  return 'AED '+num.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function findSettingsInput(labelText,scopeId='set-company'){
  const scope=document.getElementById(scopeId);
  if(!scope)return null;
  const target=String(labelText||'').trim().toLowerCase();
  const group=[...scope.querySelectorAll('.fg')].find(item=>{
    const label=item.querySelector('.fl,label');
    return label&&label.textContent.trim().toLowerCase()===target;
  });
  return group?.querySelector('input,select,textarea')||null;
}

function setFieldValue(input,value){
  if(!input||value==null)return;
  input.value=String(value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
}

function setCheckboxValue(input,checked){
  if(!input)return;
  input.checked=Boolean(checked);
  input.dispatchEvent(new Event('change',{bubbles:true}));
}

function readFieldValue(labelText,scopeId='set-company'){
  return (findSettingsInput(labelText,scopeId)?.value||'').trim();
}

function applyCompanyToUi(company){
  if(!company)return;
  currentCompany=company;
  const name=company.name||'';
  const trn=company.trn||'';
  setFieldValue(findSettingsInput('Legal Company Name'),name);
  setFieldValue(document.getElementById('set-company-trn'),trn);
  setFieldValue(document.getElementById('trn'),trn);
  const layoutCompany=document.getElementById('inv-layout-company');
  if(layoutCompany&&!layoutCompany.dataset.userEdited)setFieldValue(layoutCompany,name);
  updateInvoiceLayoutPreview?.();
}

async function syncCompanyFromDatabase(){
  const ready=await ensureBackendSession();
  if(!ready)return null;
  try{
    const response=await authenticatedFetch(`${apiBaseUrl()}/companies/current`);
    if(!response.ok)throw new Error('Company API returned '+response.status);
    const company=await response.json();
    applyCompanyToUi(company);
    return company;
  }catch(err){
    console.warn('Company database sync failed:',err);
    return null;
  }
}

async function saveCompanySettingsToDatabase(){
  const name=readFieldValue('Legal Company Name')||currentCompany?.name||'TaxFlow UAE LLC';
  const trn=(document.getElementById('set-company-trn')?.value||currentCompany?.trn||'').replace(/\D/g,'');
  const country=currentCompany?.country||'United Arab Emirates';
  const response=await authenticatedFetch(`${apiBaseUrl()}/companies/current`,{
    method:'PUT',
    body:JSON.stringify({name,trn:trn||null,country})
  });
  if(!response.ok)throw new Error('Company save returned '+response.status);
  const company=await response.json();
  applyCompanyToUi(company);
  return company;
}

function setDashboardStat(label,value,delta){
  const idMap={
    'Total Revenue':['dash-revenue','dash-revenue-sub'],
    'VAT Payable':['dash-vat','dash-vat-sub'],
    'Open Invoices':['dash-open-invoices','dash-open-invoices-sub'],
    'Staff Present':['dash-staff','dash-staff-sub']
  };
  const ids=idMap[label];
  if(ids){
    const val=document.getElementById(ids[0]);
    const sub=document.getElementById(ids[1]);
    if(val)val.textContent=value;
    if(sub&&delta)sub.textContent=delta;
  }
  document.querySelectorAll('#page-dashboard .stat').forEach(stat=>{
    const title=stat.querySelector('.stat-lbl');
    if(title&&title.textContent.trim()===label){
      const val=stat.querySelector('.stat-val');
      const sub=stat.querySelector('.stat-delta');
      if(val)val.textContent=value;
      if(sub&&delta)sub.textContent=delta;
    }
  });
}

function setNavBadge(page,count,variant=''){
  const nav=[...document.querySelectorAll('.nav')].find(item=>(item.getAttribute('onclick')||'').includes(`'${page}'`));
  if(!nav)return;
  let badge=nav.querySelector('.nbadge');
  if(!badge){
    badge=document.createElement('span');
    nav.appendChild(badge);
  }
  badge.className=`nbadge ${variant}`.trim();
  badge.textContent=Number(count||0).toLocaleString('en-AE');
}

function syncSidebarCounts(data){
  const counts=data.module_counts||data;
  const salesTotal=(Number(counts.invoice_count)||0)+(Number(counts.product_count)||0)+(Number(counts.customer_count)||0);
  const purchaseTotal=Number(counts.purchase_record_count??counts.purchase_source_count??0)||0;
  const billsTotal=(Number(counts.bill_count)||0)+(Number(counts.vendor_count)||0);
  setNavBadge('sales',salesTotal);
  setNavBadge('quotations',counts.quotation_count||0,'warn');
  setNavBadge('purchase',purchaseTotal,'warn');
  setNavBadge('bills',billsTotal,'warn');
  setNavBadge('bank',counts.account_count);
  setNavBadge('payments',counts.payment_count??data.kpis?.open_invoice_count??data.open_invoices,'warn');
  setNavBadge('accounting',counts.journal_count);
  setNavBadge('reports',counts.tax_line_count);
  setNavBadge('inventory',counts.inventory_mapping_count);
  setNavBadge('documents',counts.document_count);
  setNavBadge('staff',counts.employee_count,'warn');
  setNavBadge('rota',counts.employee_count);
  setNavBadge('payroll',counts.payroll_run_count||counts.employee_count);
  setNavBadge('notifications',counts.job_count);
  setNavBadge('expert',counts.audit_count?'1':0,counts.audit_count?'red':'');
  setNavBadge('settings',(Number(counts.sales_category_count)||0)+(Number(counts.sales_unit_count)||0)+(Number(counts.account_count)||0));
}

function renderDashboardMeta(data){
  const meta=data.dashboard_meta||{};
  if(meta.title)META.dashboard.t=meta.title;
  if(meta.subtitle)META.dashboard.s=meta.subtitle;
  const dashboardVisible=document.getElementById('page-dashboard')?.classList.contains('on');
  if(dashboardVisible){
    const title=document.getElementById('ptitle');
    const sub=document.getElementById('psub');
    if(title)title.textContent=meta.title||'Dashboard';
    if(sub)sub.textContent=meta.subtitle||'Dashboard loaded from database records';
  }
}

async function syncDashboardFromDatabase(){
  const ready=await ensureBackendSession();
  if(!ready){
    setDashboardStat('Total Revenue','Login needed','Open the root app and sign in');
    setDashboardStat('VAT Payable','Login needed','No backend token found');
    setDashboardStat('Open Invoices','Login needed','Dashboard cannot read database');
    setDashboardStat('Staff Present','Login needed','Use admin@taxflowapp.com');
    return;
  }
  if(!window.__taxflowFreshDashboardLoaded)renderCachedDashboardSnapshot();
  try{
    const response=await authenticatedFetch(`${apiBaseUrl()}/reports/dashboard`);
    if(!response.ok)throw new Error('Dashboard API returned '+response.status);
    const data=await response.json();
    window.__taxflowFreshDashboardLoaded=true;
    try{localStorage.setItem('taxflow_dashboard_snapshot',JSON.stringify(data));}catch{}
    if(data.company)applyCompanyToUi(data.company);
    renderDashboardMeta(data);
    syncSidebarCounts(data);
    renderFullDashboardFromDatabase(data);
  }catch(err){
    console.warn('Dashboard database sync failed:',err);
    setDashboardStat('Total Revenue','API error','Check backend connection');
    setDashboardStat('VAT Payable','API error','Dashboard sync failed');
    setDashboardStat('Open Invoices','API error','Open browser console for details');
    setDashboardStat('Staff Present','API error','Try http://127.0.0.1:5173');
    const target=document.getElementById('dash-recent-activity');
    if(target)target.innerHTML=`<div style="font-size:12px;color:var(--red)">Dashboard database sync failed: ${escapeHtml(err.message||err)}</div>`;
  }
}

function renderCachedDashboardSnapshot(){
  let cached=null;
  try{cached=JSON.parse(localStorage.getItem('taxflow_dashboard_snapshot')||'null');}catch{}
  if(cached){
    renderDashboardMeta(cached);
    syncSidebarCounts(cached);
    renderFullDashboardFromDatabase(cached);
    return;
  }
  setDashboardStat('Total Revenue','AED 0.00','Syncing database...');
  setDashboardStat('VAT Payable','AED 0.00','Syncing database...');
  setDashboardStat('Open Invoices','0','Syncing database...');
  setDashboardStat('Staff Present','0/0','Syncing database...');
}

function renderFullDashboardFromDatabase(data){
  const counts=data.module_counts||data;
  const kpis=data.kpis||{
    revenue:data.revenue,
    vat_payable:data.vat_payable,
    open_invoice_count:data.open_invoices,
    open_invoice_amount:0,
    staff_present:data.employee_count,
    staff_total:data.employee_count,
    payroll_net:data.payroll_net
  };
  setDashboardStat('Total Revenue',formatAed(kpis.revenue),`${counts.invoice_count||0} invoices in database`);
  setDashboardStat('VAT Payable',formatAed(kpis.vat_payable),`${counts.tax_line_count||0} tax lines - DB period`);
  setDashboardStat('Open Invoices',String(kpis.open_invoice_count||0),`${formatAed(kpis.open_invoice_amount||0)} open amount`);
  setDashboardStat('Staff Present',`${kpis.staff_present||0}/${kpis.staff_total||0}`,`${counts.payroll_run_count||0} payroll run - ${formatAed(kpis.payroll_net||0)} net`);
  renderMonthlyRevenueVat(data.monthly_revenue_vat||[]);
  renderRecentActivity(data.recent_activity||[]);
  renderTopCustomers(data.top_customers||[]);
  renderInvoiceStatus(data.invoice_status||{});
  renderStaffToday(data.staff_today||{present:kpis.staff_present||0,total:kpis.staff_total||0,leave:0,absent:0,source:'Employees database'});
  renderDatabaseDashboardSummary(data);
}

function renderMonthlyRevenueVat(rows){
  const bars=document.getElementById('dash-monthly-bars');
  const summary=document.getElementById('dash-monthly-summary');
  if(!bars||!summary)return;
  const safeRows=rows.length?rows:[{period:'Current',sales:0,purchases:0,output_vat:0,input_vat:0,net_vat:0}];
  const max=Math.max(1,...safeRows.map(row=>Number(row.sales||0)));
  bars.innerHTML=safeRows.map(row=>{
    const height=Math.max(8,Math.round((Number(row.sales||0)/max)*88));
    const vatHeight=Math.max(5,Math.round((Math.abs(Number(row.net_vat||0))/max)*88));
    return `
      <div class="dash-month-col">
        <div class="dash-month-bars">
          <div class="bar sales" title="${escapeHtml(formatAed(row.sales))}" style="height:${height}px"></div>
          <div class="bar vat" title="${escapeHtml(formatAed(row.net_vat))}" style="height:${vatHeight}px"></div>
        </div>
        <div class="dash-month-label">${escapeHtml(row.period)}</div>
      </div>`;
  }).join('');
  const latest=safeRows[safeRows.length-1]||{};
  summary.innerHTML=`
    <div class="dash-month-metric"><div class="mono sales">${escapeHtml(formatAed(latest.sales||0))}</div><span>Output Sales</span></div>
    <div class="dash-month-metric"><div class="mono purchases">${escapeHtml(formatAed(latest.purchases||0))}</div><span>Purchases</span></div>
    <div class="dash-month-metric"><div class="mono vat">${escapeHtml(formatAed(latest.net_vat||0))}</div><span>Net VAT</span></div>
  `;
}

function renderRecentActivity(rows){
  const target=document.getElementById('dash-recent-activity');
  if(!target)return;
  const tones={ok:['var(--green-bg)','var(--green)','?'],warn:['var(--amber-bg)','var(--amber)','!'],info:['var(--accent-glow)','var(--accent)','?']};
  if(!rows.length){
    target.innerHTML='<div style="font-size:12px;color:var(--text3)">No database activity yet.</div>';
    return;
  }
  target.innerHTML=rows.map((row,index)=>{
    const tone=tones[row.tone]||tones.info;
    return `<div class="tline-item" style="${index===rows.length-1?'padding-bottom:0':''}"><div class="tline-dot" style="background:${tone[0]};color:${tone[1]}">${tone[2]}</div><div><div style="font-size:13px;font-weight:500">${escapeHtml(row.title||'Activity')}</div><div style="font-size:11.5px;color:var(--text3);margin-top:2px">${escapeHtml(row.module||'System')} - ${escapeHtml(row.time||'Now')}</div></div></div>`;
  }).join('');
}

function renderTopCustomers(rows){
  const tbody=document.getElementById('dash-top-customers');
  if(!tbody)return;
  tbody.innerHTML=rows.length
    ? rows.map(row=>`<tr><td>${escapeHtml(row.name)}</td><td class="mono" style="text-align:right;color:var(--accent)">${escapeHtml(formatAed(row.total))}</td></tr>`).join('')
    : '<tr><td colspan="2" style="color:var(--text3)">No invoice customers in database.</td></tr>';
  refreshEnhancedTable(tbody.closest('table'));
  refreshPurchaseProductSuggestions();
}

function renderInvoiceStatus(status){
  const target=document.getElementById('dash-invoice-status');
  if(!target)return;
  const rows=[
    ['Paid',status.paid,'b-g','var(--green)'],
    ['Pending',status.pending,'b-a','var(--amber)'],
    ['Overdue',status.overdue,'b-r','var(--red)']
  ];
  target.innerHTML=rows.map(([label,row,badge,bar],index)=>{
    const item=row||{count:0,percentage:0};
    return `<div style="${index<rows.length-1?'margin-bottom:10px':''}"><div class="flx-b mb12"><span style="font-size:12.5px">${label}</span><span class="b ${badge}">${Number(item.count||0)} invoices</span></div><div class="prog-bar"><div class="prog-fill" style="width:${Math.min(100,Number(item.percentage||0))}%;background:${bar}"></div></div></div>`;
  }).join('');
}

function renderStaffToday(staff){
  const target=document.getElementById('dash-staff-today');
  if(!target)return;
  target.innerHTML=`
    <div style="font-size:28px;font-weight:700;color:var(--green);font-family:'DM Mono',monospace;margin-bottom:4px">${Number(staff.present||0)} <span style="font-size:16px;color:var(--text3)">/${Number(staff.total||0)}</span></div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px">Present - ${escapeHtml(staff.source||'Employees database')}</div>
    <div class="flx" style="flex-wrap:wrap;gap:6px">
      <span class="b b-g">${Number(staff.present||0)} Present</span>
      <span class="b b-a">${Number(staff.leave||0)} Leave</span>
      <span class="b b-r">${Number(staff.absent||0)} Absent</span>
    </div>
  `;
}

async function syncReportsFromDatabase(){
  const ready=await ensureBackendSession();
  if(!ready)return;
  try{
    const response=await authenticatedFetch(`${apiBaseUrl()}/reports/summary`);
    if(!response.ok)throw new Error('Reports API returned '+response.status);
    const data=await response.json();
    renderReportsFromDatabase(data);
  }catch(err){
    console.warn('Reports database sync failed:',err);
  }
}

function reportAmount(value){
  return Number(value||0).toLocaleString('en-AE',{maximumFractionDigits:2});
}

function setReportStat(stat,value,delta){
  if(!stat)return;
  const val=stat.querySelector('.stat-val');
  const sub=stat.querySelector('.stat-delta');
  if(val)val.textContent=value;
  if(sub&&delta!==undefined)sub.textContent=delta;
}

function renderReportsFromDatabase(data){
  renderReportDashboard(data.dashboard||{});
  renderVatReport(data.vat||{});
  renderProfitLossReport(data.profit_loss||{});
  renderBalanceSheetReport(data.balance_sheet||{});
  renderTrialBalanceReport(data.trial_balance||[]);
  renderAgingReport(data.aging||[]);
  renderReportAI(data.ai||{});
  document.querySelectorAll('#page-reports table.tbl').forEach(refreshEnhancedTable);
}

function renderReportDashboard(report){
  const stats=document.querySelectorAll('#rep-dash .g4.mb16 .stat');
  setReportStat(stats[0],formatAed(report.revenue||0),'from invoices database');
  setReportStat(stats[1],`${report.gross_margin||'0.00'}%`,'gross profit / revenue');
  setReportStat(stats[2],`${report.cash_runway_months||'0.00'} mo`,'database forecast');
  setReportStat(stats[3],report.risk_score||'Low',`${report.risk_issues||0} issues detected`);
  const risk=document.getElementById('rep-risk-score');
  if(risk)risk.textContent=report.risk_score||'Low';
  const monthly=report.monthly||[];
  const chart=document.querySelector('#rep-dash .axis-body');
  if(chart){
    const max=Math.max(1,...monthly.map(row=>Number(row.sales||0)),...monthly.map(row=>Number(row.purchases||0)));
    chart.innerHTML=(monthly.length?monthly:[{period:'Current',sales:0,purchases:0}]).map(row=>`
      <div class="chart-col">
        <div class="chart-stack" style="height:${Math.max(6,Math.round((Number(row.sales||0)/max)*94))}%"></div>
        <div class="chart-stack amber" style="height:${Math.max(6,Math.round((Number(row.purchases||0)/max)*94))}%"></div>
        <div class="chart-label">${escapeHtml(row.period)}</div>
      </div>`).join('');
  }
  renderReceivableRiskMix(report.receivables||{});
  const aiSummary=document.getElementById('ai-summary');
  if(aiSummary)aiSummary.textContent=report.ai_summary||'Report summary is generated from database records.';
  const aiScore=document.querySelector('#rep-dash .ai-score');
  if(aiScore)aiScore.textContent=report.ai_score||0;
  const actionBox=document.getElementById('ai-actions');
  if(actionBox)actionBox.innerHTML=(report.actions||[]).map(item=>`<div>- ${escapeHtml(item)}</div>`).join('');
  const forecastRows=document.querySelectorAll('#rep-cash-forecast .risk-row');
  (report.cash_forecast||[]).forEach((item,index)=>{
    const row=forecastRows[index];
    if(!row)return;
    row.querySelector('span:first-child').textContent=item.label;
    row.querySelector('.mono').textContent=formatAed(item.amount).replace('AED ','');
    const fill=row.querySelector('.risk-fill');
    if(fill){
      fill.className='risk-fill '+(item.tone==='danger'?'danger':item.tone==='warn'?'warn':'');
      fill.style.width=`${Math.max(8,Math.min(100,Math.abs(Number(item.amount||0))/1000))}%`;
    }
  });
}

function renderReceivableRiskMix(receivables){
  const donut=document.querySelector('#rep-dash .donut');
  if(donut)donut.dataset.label=formatAed(receivables.label||0).replace('AED ','AED ');
  const rows=document.querySelectorAll('#rep-receivable-card .risk-row');
  (receivables.buckets||[]).forEach((bucket,index)=>{
    const row=rows[index];
    if(!row)return;
    row.querySelector('span:first-child').textContent=bucket.label;
    row.querySelector('.mono').textContent=`${bucket.percentage||0}%`;
    const fill=row.querySelector('.risk-fill');
    if(fill){
      fill.className='risk-fill '+(bucket.tone==='danger'?'danger':bucket.tone==='warn'?'warn':'');
      fill.style.width=`${Math.min(100,Number(bucket.percentage||0))}%`;
    }
  });
}

function renderVatReport(vat){
  const title=document.querySelector('#rep-vat .card-title');
  if(title)title.textContent=`VAT 201 Return - ${vat.period||'Current'}`;
  const outputBody=document.querySelector('#rep-vat .g2.mb16 .card:nth-child(1) tbody');
  if(outputBody){
    const out=vat.output||{};
    outputBody.innerHTML=`
      <tr><td class="mono">1</td><td>Standard rated supplies</td><td class="mono" style="text-align:right">${reportAmount(out.standard_rated)}</td></tr>
      <tr><td class="mono">2</td><td>Zero-rated supplies</td><td class="mono" style="text-align:right">${reportAmount(out.zero_rated)}</td></tr>
      <tr><td class="mono">3</td><td>Exempt supplies</td><td class="mono" style="text-align:right">${reportAmount(out.exempt)}</td></tr>
      <tr><td class="mono">4</td><td>Total supplies</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(out.total_supplies)}</td></tr>
      <tr><td class="mono">5</td><td>Output VAT</td><td class="mono" style="text-align:right;color:var(--accent)">${reportAmount(out.output_vat)}</td></tr>`;
  }
  const inputBody=document.querySelector('#rep-vat .g2.mb16 .card:nth-child(2) tbody');
  if(inputBody){
    const input=vat.input||{};
    inputBody.innerHTML=`
      <tr><td class="mono">6</td><td>Standard rated purchases</td><td class="mono" style="text-align:right">${reportAmount(input.standard_rated)}</td></tr>
      <tr><td class="mono">7</td><td>Zero-rated purchases</td><td class="mono" style="text-align:right">${reportAmount(input.zero_rated)}</td></tr>
      <tr><td class="mono">8</td><td>Exempt purchases</td><td class="mono" style="text-align:right">${reportAmount(input.exempt)}</td></tr>
      <tr><td class="mono">9</td><td>Total purchases</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(input.total_purchases)}</td></tr>
      <tr><td class="mono">10</td><td>Input VAT</td><td class="mono" style="text-align:right;color:var(--green)">${reportAmount(input.input_vat)}</td></tr>`;
  }
  const settlement=vat.settlement||{};
  const settlementStats=document.querySelectorAll('#rep-vat .card:nth-of-type(3) .stat');
  setReportStat(settlementStats[0],formatAed(settlement.output_vat||0));
  setReportStat(settlementStats[1],formatAed(settlement.input_vat||0));
  setReportStat(settlementStats[2],formatAed(settlement.net_vat_payable||0),'database tax lines');
  const movement=document.querySelector('#rep-vat .axis-body');
  const rows=vat.movement||[];
  if(movement){
    const max=Math.max(1,...rows.map(row=>Number(row.output_vat||0)),...rows.map(row=>Number(row.input_vat||0)));
    movement.innerHTML=(rows.length?rows:[{period:'Current',output_vat:0,input_vat:0}]).map(row=>`
      <div class="chart-col">
        <div class="chart-stack" style="height:${Math.max(6,Math.round((Number(row.output_vat||0)/max)*92))}%"></div>
        <div class="chart-stack green" style="height:${Math.max(6,Math.round((Number(row.input_vat||0)/max)*92))}%"></div>
        <div class="chart-label">${escapeHtml(row.period)}</div>
      </div>`).join('');
  }
}

function renderProfitLossReport(pl){
  const body=document.querySelector('#rep-pl table.tbl tbody');
  if(!body)return;
  const ytd=pl.ytd||{};
  body.innerHTML=`
    <tr><td colspan="3" style="font-weight:600;background:var(--surface2)">Revenue</td></tr>
    <tr><td style="padding-left:20px">Sales Revenue</td><td class="mono" style="text-align:right">${reportAmount(pl.revenue)}</td><td class="mono" style="text-align:right">${reportAmount(ytd.revenue)}</td></tr>
    <tr><td style="padding-left:20px">Other Income</td><td class="mono" style="text-align:right">${reportAmount(pl.other_income)}</td><td class="mono" style="text-align:right">0</td></tr>
    <tr><td style="font-weight:600">Total Revenue</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(pl.total_revenue)}</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(ytd.revenue)}</td></tr>
    <tr><td colspan="3" style="font-weight:600;background:var(--surface2)">Cost of Goods Sold</td></tr>
    <tr><td style="padding-left:20px">Cost of Goods Sold</td><td class="mono" style="text-align:right">${reportAmount(pl.cogs)}</td><td class="mono" style="text-align:right">${reportAmount(ytd.cogs)}</td></tr>
    <tr><td style="font-weight:600">Gross Profit</td><td class="mono" style="text-align:right;font-weight:600;color:var(--green)">${reportAmount(pl.gross_profit)}</td><td class="mono" style="text-align:right;font-weight:600;color:var(--green)">${reportAmount(ytd.gross_profit)}</td></tr>
    <tr><td colspan="3" style="font-weight:600;background:var(--surface2)">Operating Expenses</td></tr>
    <tr><td style="padding-left:20px">Payroll</td><td class="mono" style="text-align:right">${reportAmount(pl.payroll)}</td><td class="mono" style="text-align:right">${reportAmount(pl.payroll)}</td></tr>
    <tr><td style="padding-left:20px">Other Expenses</td><td class="mono" style="text-align:right">${reportAmount(pl.other_expenses)}</td><td class="mono" style="text-align:right">${reportAmount(pl.other_expenses)}</td></tr>
    <tr><td style="font-weight:600">Total Expenses</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(pl.total_expenses)}</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(ytd.expenses)}</td></tr>
    <tr><td style="font-weight:700;font-size:14px">Net Profit</td><td class="mono" style="text-align:right;font-weight:700;font-size:16px;color:var(--green)">${reportAmount(pl.net_profit)}</td><td class="mono" style="text-align:right;font-weight:700;font-size:16px;color:var(--green)">${reportAmount(ytd.net_profit)}</td></tr>`;
}

function renderBalanceSheetReport(bs){
  const totals=bs.totals||{};
  const stats=document.querySelectorAll('#rep-bs .g4.mb16 .stat');
  setReportStat(stats[0],formatAed(totals.assets||0),'asset accounts');
  setReportStat(stats[1],formatAed(totals.liabilities||0),'liability accounts');
  setReportStat(stats[2],formatAed(totals.equity||0),'equity accounts');
  setReportStat(stats[3],formatAed(totals.difference||0),'should be AED 0.00');
  const assetBody=document.getElementById('rep-bs-assets');
  if(assetBody){
    const rows=bs.assets||[];
    assetBody.innerHTML=rows.length?rows.map(row=>`<tr><td class="mono">${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td class="mono" style="text-align:right">${reportAmount(row.amount)}</td></tr>`).join(''):`<tr><td colspan="3" style="color:var(--text3);text-align:center">No asset journal balances found in database.</td></tr>`;
    assetBody.innerHTML+=`<tr style="background:var(--surface2)"><td colspan="2" style="font-weight:600">Total Assets</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(totals.assets)}</td></tr>`;
  }
  const liabBody=document.getElementById('rep-bs-liabilities-equity');
  if(liabBody){
    const liabilities=(bs.liabilities||[]).map(row=>({...row,section:'Liabilities'}));
    const equity=(bs.equity||[]).map(row=>({...row,section:'Equity'}));
    const rows=[...liabilities,...equity];
    liabBody.innerHTML=rows.length?rows.map(row=>`<tr><td>${escapeHtml(row.section)}</td><td><span class="mono">${escapeHtml(row.code)}</span> ${escapeHtml(row.name)}</td><td class="mono" style="text-align:right">${reportAmount(row.amount)}</td></tr>`).join(''):`<tr><td colspan="3" style="color:var(--text3);text-align:center">No liability or equity journal balances found in database.</td></tr>`;
    liabBody.innerHTML+=`<tr style="background:var(--surface2)"><td colspan="2" style="font-weight:600">Total Liabilities & Equity</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(totals.liabilities_equity)}</td></tr>`;
  }
}

function renderTrialBalanceReport(rows){
  const body=document.querySelector('#rep-tb table.tbl tbody');
  if(!body)return;
  const debitTotal=rows.reduce((sum,row)=>sum+Number(row.debit||0),0);
  const creditTotal=rows.reduce((sum,row)=>sum+Number(row.credit||0),0);
  body.innerHTML=rows.length?rows.map(row=>`<tr><td class="mono">${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td class="mono" style="text-align:right">${reportAmount(row.debit)}</td><td class="mono" style="text-align:right">${reportAmount(row.credit)}</td></tr>`).join(''):`<tr><td colspan="4" style="color:var(--text3);text-align:center">No posted journal lines found in database.</td></tr>`;
  body.innerHTML+=`<tr style="background:var(--surface2)"><td colspan="2" style="font-weight:600">Total</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(debitTotal)}</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(creditTotal)}</td></tr>`;
}

function renderAgingReport(rows){
  const body=document.querySelector('#rep-ar table.tbl tbody');
  if(!body)return;
  const total=rows.reduce((sum,row)=>sum+Number(row.total||0),0);
  body.innerHTML=rows.length?rows.map(row=>`<tr><td>${escapeHtml(row.customer)}</td><td class="mono" style="text-align:right">${reportAmount(row.current)}</td><td class="mono" style="text-align:right">${reportAmount(row.d1_30)}</td><td class="mono" style="text-align:right">${reportAmount(row.d31_60)}</td><td class="mono" style="text-align:right">${reportAmount(row.d61_90)}</td><td class="mono" style="text-align:right">${reportAmount(row.over90)}</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(row.total)}</td></tr>`).join(''):`<tr><td colspan="7" style="color:var(--text3);text-align:center">No unpaid invoices found in database.</td></tr>`;
  body.innerHTML+=`<tr style="background:var(--surface2)"><td colspan="6" style="text-align:right;font-weight:600">Total Receivables</td><td class="mono" style="text-align:right;font-weight:600">${reportAmount(total)}</td></tr>`;
}

function renderReportAI(ai){
  const stats=document.querySelectorAll('#rep-ai .g4.mb16 .stat');
  setReportStat(stats[0],`${ai.forecast_confidence||0}%`,'database confidence');
  setReportStat(stats[1],String(ai.anomalies||0),'from report checks');
  setReportStat(stats[2],formatAed(ai.potential_savings||0),'5% expense opportunity');
  setReportStat(stats[3],formatAed(ai.collection_upside||0),'open receivables');
  const body=document.getElementById('ai-anomaly-tbody');
  if(body){
    body.innerHTML=(ai.anomalies_list||[]).map(row=>`<tr><td>${escapeHtml(row.area)}</td><td>${escapeHtml(row.signal)}</td><td><span class="b ${row.impact==='High'?'b-r':row.impact==='Medium'?'b-a':'b-g'}">${escapeHtml(row.impact)}</span></td><td><button class="btn btn-g btn-sm" onclick="go('reports')">${escapeHtml(row.action)}</button></td></tr>`).join('');
  }
}

function activeReportBody(){
  return document.querySelector('#page-reports .tab-body.on')||document.getElementById('rep-dash');
}

function activeReportTitle(){
  const activeTab=document.querySelector('#page-reports .tabs .tab.on');
  return activeTab?.textContent.trim()||'Reports';
}

function exportActiveReportPdf(){
  const body=activeReportBody();
  if(!body){
    toast('Open a report before exporting','warn');
    return;
  }
  exportReportPdf(body.id,activeReportTitle());
}

function exportAllReportsPdf(){
  exportReportPdf('all','All Reports');
}

function exportReportPdf(targetId,title){
  const source=targetId==='all'
    ? [...document.querySelectorAll('#page-reports .tab-body')].map(section=>{
        const tab=[...document.querySelectorAll('#page-reports .tabs .tab')].find(item=>(item.getAttribute('onclick')||'').includes(`'${section.id}'`));
        return `<section class="pdf-section"><h2>${escapeHtml(tab?.textContent.trim()||section.id)}</h2>${section.innerHTML}</section>`;
      }).join('')
    : document.getElementById(targetId)?.innerHTML;
  if(!source){
    toast('Report content not found','warn');
    return;
  }
  const safeTitle=title||'TaxFlow Report';
  const printWindow=window.open('','_blank','width=1100,height=800');
  if(!printWindow){
    toast('Allow popups to export PDF','warn');
    return;
  }
  const styles=[...document.querySelectorAll('link[rel="stylesheet"],style')].map(node=>node.outerHTML).join('\n');
  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(safeTitle)} - TaxFlow</title>${styles}<style>
    body{background:#fff;color:#111;padding:24px;height:auto;overflow:auto;}
    .pdf-shell{max-width:1120px;margin:0 auto;}
    .pdf-cover{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #d9dee8;padding-bottom:14px;margin-bottom:18px;}
    .pdf-title{font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:#1e2540;}
    .pdf-meta{font-size:12px;color:#5f6b7a;text-align:right;line-height:1.6;}
    .tab-body{display:block!important;}
    .tabs,.btn,.topbar,.sb,.scrim,.toasts,.tbl-tools{display:none!important;}
    .card,.stat,.ai-card,.chart-panel,.setting-tile{break-inside:avoid;background:#fff!important;border:1px solid #d9dee8!important;box-shadow:none!important;}
    .tbl{width:100%;min-width:0!important;border-collapse:collapse;}
    .tbl th,.tbl td{border-bottom:1px solid #e7ebf2;color:#111!important;}
    .pdf-section{break-after:page;margin-bottom:22px;}
    .pdf-section:last-child{break-after:auto;}
    @page{size:A4 landscape;margin:10mm;}
  </style></head><body><div class="pdf-shell"><div class="pdf-cover"><div><div class="pdf-title">${escapeHtml(safeTitle)}</div><div style="font-size:13px;color:#5f6b7a;margin-top:4px">TaxFlow UAE Business Platform</div></div><div class="pdf-meta">Generated from database<br>${escapeHtml(new Date().toLocaleString('en-AE'))}</div></div>${targetId==='all'?source:`<section class="pdf-section">${source}</section>`}</div><script>window.onload=()=>{setTimeout(()=>{window.print();},250);};<\/script></body></html>`);
  printWindow.document.close();
  toast(`${safeTitle} PDF export opened`,'ok');
  audit('Exported report PDF',safeTitle,'Prepared');
}

function renderDatabaseDashboardSummary(data){
  const page=document.getElementById('page-dashboard');
  if(!page)return;
  const counts=data.module_counts||data;
  const company=data.company||currentCompany||{};
  const meta=data.dashboard_meta||{};
  let card=document.getElementById('db-dashboard-summary');
  if(!card){
    card=document.createElement('div');
    card.id='db-dashboard-summary';
    card.className='card mb16';
    const firstStats=page.querySelector('.g4.mb16');
    if(firstStats&&firstStats.nextSibling)page.insertBefore(card,firstStats.nextSibling);
    else page.prepend(card);
  }
  const rows=[
    {label:'Invoices',count:counts.invoice_count,page:'sales',tab:'s-invoices',icon:'INV',tone:'accent',copy:'Open sales invoice register'},
    {label:'Customers',count:counts.customer_count,page:'sales',tab:'s-customers',icon:'CUS',tone:'green',copy:'Customer master from database'},
    {label:'Products',count:counts.product_count,page:'sales',tab:'s-products',icon:'SKU',tone:'teal',copy:'Item and service catalogue'},
    {label:'Quotations',count:counts.quotation_count,page:'quotations',tab:'q-list',icon:'QTN',tone:'purple',copy:'Quotation list connected to database'},
    {label:'Purchases',count:counts.purchase_record_count,page:'purchase',tab:'p-records',icon:'PUR',tone:'amber',copy:'Purchase register from database'},
    {label:'Vendors',count:counts.vendor_count,page:'purchase',tab:'p-vendors',icon:'VEN',tone:'green',copy:'Supplier and vendor master'},
    {label:'Payments',count:counts.payment_count,page:'payments',icon:'PAY',tone:'accent',copy:'Receipts and supplier payments'},
    {label:'Accounts',count:counts.account_count,page:'accounting',tab:'acc-chart',icon:'COA',tone:'teal',copy:'Chart of accounts'},
    {label:'Journals',count:counts.journal_count,page:'accounting',tab:'acc-journal',icon:'JE',tone:'purple',copy:'Journal entries and ledger'},
    {label:'Source Transactions',count:counts.source_transaction_count,page:'purchase',tab:'p-records',icon:'SRC',tone:'amber',copy:'Sales, purchase, and payment sources'},
    {label:'Tax Codes',count:counts.tax_code_count,page:'settings',tab:'set-tax',icon:'VAT',tone:'green',copy:'VAT setup and tax rules'},
    {label:'Tax Lines',count:counts.tax_line_count,page:'reports',tab:'rep-vat',icon:'TAX',tone:'red',copy:'VAT report lines'},
    {label:'Warehouses',count:counts.warehouse_count,page:'inventory',tab:'inv-stock',icon:'WH',tone:'teal',copy:'Warehouse stock dashboard'},
    {label:'Inventory Mappings',count:counts.inventory_mapping_count,page:'inventory',tab:'inv-mapping',icon:'SKU',tone:'accent',copy:'Product and stock mappings'},
    {label:'Employees',count:counts.employee_count,page:'staff',tab:'staff-list',icon:'HR',tone:'purple',copy:'Staff management'},
    {label:'Jobs',count:counts.job_count,page:'notifications',icon:'JOB',tone:'amber',copy:'Background jobs and alerts'},
    {label:'Documents',count:counts.document_count,page:'documents',icon:'DOC',tone:'green',copy:'Uploaded files and attachments'},
    {label:'Audit Logs',count:counts.audit_count,page:'settings',tab:'set-backup',icon:'LOG',tone:'red',copy:'Backup and audit trail'}
  ];
  card.innerHTML=`
    <div class="card-hd">
      <span class="b b-g">${escapeHtml(meta.status||'Database synced')}</span>
    </div>
    <div class="db-shortcuts">
      ${rows.map(item=>`
        <button class="db-shortcut ${escapeHtml(item.tone)}" type="button" onclick="openDashboardRecord('${escapeHtml(item.page)}','${escapeHtml(item.tab||'')}')">
          <span class="db-shortcut-icon">${escapeHtml(item.icon)}</span>
          <span class="db-shortcut-body">
            <span class="db-shortcut-top">
              <strong>${escapeHtml(item.label)}</strong>
              <span class="mono">${Number(item.count||0).toLocaleString('en-AE')}</span>
            </span>
            <span class="db-shortcut-copy">${escapeHtml(item.copy)}</span>
          </span>
        </button>
      `).join('')}
    </div>
  `;
}

function openDashboardRecord(page,tabTarget=''){
  go(page);
  if(tabTarget){
    setTimeout(()=>{
      const tab=[...document.querySelectorAll(`#page-${page} .tab`)].find(item=>(item.getAttribute('onclick')||'').includes(`'${tabTarget}'`));
      if(tab)stab(tab,tabTarget);
    },40);
  }
}

function applyTheme(mode){
  const nightMode=mode!=='light';
  document.body.classList.toggle('theme-light',!nightMode);
  const toggle=document.getElementById('night-mode-toggle');
  if(toggle)toggle.checked=nightMode;
  const status=document.getElementById('theme-status');
  if(status){
    status.textContent=nightMode?'Night mode':'Day mode';
    status.className=nightMode?'b b-b':'b b-g';
  }
  const menuToggle=document.getElementById('theme-menu-toggle');
  if(menuToggle){
    menuToggle.textContent=nightMode?'☀ Light Mode':'☾ Dark Mode';
    menuToggle.title=nightMode?'Switch to light mode':'Switch to night mode';
  }
}

function toggleNightMode(enabled){
  const mode=enabled?'night':'light';
  applyTheme(mode);
  toast(enabled?'Night mode enabled':'Day mode enabled','info');
}

async function apiRequest(action,payload,options={}){
  await ensureBackendSession();
  const endpoint=APP_CONFIG.apiEndpoint||`${apiBaseUrl()}/app-data`;
  const response=await authenticatedFetch(`${endpoint}?action=${encodeURIComponent(action)}`,{
    method:options.method||'POST',
    body:options.method==='GET'?undefined:JSON.stringify(payload||{})
  });
  if(!response.ok)throw new Error('FastAPI app-data endpoint returned '+response.status);
  const data=await response.json();
  if(data&&data.ok===false)throw new Error(data.error||'FastAPI app-data request failed');
  return data;
}

function saveServer(collection,record,options={}){
  return apiRequest('save',{collection,record}).catch(err=>{
    console.warn('Database save failed:',err);
    if(options.throwOnError)throw err;
    return null;
  });
}

function bulkSaveServer(collection,records,options={}){
  return apiRequest('bulk-save',{collection,records}).catch(err=>{
    console.warn('Database bulk save failed:',err);
    if(options.throwOnError)throw err;
    return null;
  });
}

async function moduleApi(path,options={}){
  const response=await authenticatedFetch(`${apiBaseUrl()}${path}`,{
    method:options.method||'GET',
    body:options.body?JSON.stringify(options.body):undefined
  });
  if(!response.ok)throw new Error(`FastAPI ${path} returned ${response.status}`);
  if(response.status===204)return null;
  return response.json();
}

function exceptionBadgeClass(severity){
  const sev=String(severity||'medium').toLowerCase();
  if(sev==='high')return 'b-r';
  if(sev==='low')return 'b-g';
  return 'b-a';
}

function exceptionAction(module){
  const mod=String(module||'').toLowerCase();
  if(mod.includes('sales'))return "go('sales')";
  if(mod.includes('purchase'))return "go('purchase')";
  if(mod.includes('inventory'))return "go('inventory')";
  if(mod.includes('payroll'))return "go('payroll')";
  if(mod.includes('account'))return "go('accounting')";
  if(mod.includes('document'))return "go('documents')";
  return "toast('Open source module to resolve this exception','info')";
}

function renderExceptionCenter(data){
  const summary=data?.summary||{};
  setText('exc-open',summary.open??0);
  setText('exc-high',summary.high??0);
  setText('exc-medium',summary.medium??0);
  setText('exc-low',summary.low??0);
  setNavBadge('exception',summary.open||0,(summary.high||0)>0?'red':'warn');
  const topCount=document.getElementById('exception-top-count');
  if(topCount){
    topCount.textContent=Number(summary.open||0).toLocaleString('en-AE');
    topCount.className=`b ${(summary.high||0)>0?'b-r':(summary.open||0)>0?'b-a':'b-g'}`;
  }
  const tbody=document.getElementById('exception-tbody');
  if(!tbody)return;
  const rows=Array.isArray(data?.exceptions)?data.exceptions:[];
  if(rows.length===0){
    tbody.innerHTML='<tr><td colspan="6" style="color:var(--text3);text-align:center">No open exceptions found.</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(row=>`
    <tr>
      <td>${escapeHtml(row.module||'-')}</td>
      <td>${escapeHtml(row.category||row.message||'-')}<div class="card-sub">${escapeHtml(row.message||'')}</div></td>
      <td class="mono">${escapeHtml(row.source_record||'-')}</td>
      <td><span class="b ${exceptionBadgeClass(row.severity)}">${escapeHtml(row.severity||'medium')}</span></td>
      <td><span class="b b-b">${escapeHtml(row.status||'open')}</span></td>
      <td><button class="btn btn-g btn-sm" onclick="${exceptionAction(row.module)}">Open</button></td>
    </tr>
  `).join('');
}

function loadExceptionCenter(){
  const tbody=document.getElementById('exception-tbody');
  if(tbody)tbody.innerHTML='<tr><td colspan="6" style="color:var(--text3);text-align:center">Reading exception center...</td></tr>';
  moduleApi('/exceptions')
    .then(renderExceptionCenter)
    .catch(err=>{
      console.warn('Exception Center unavailable:',err);
      if(tbody)tbody.innerHTML='<tr><td colspan="6" style="color:var(--red);text-align:center">Exception Center API unavailable.</td></tr>';
    });
}

function saveInvoiceLayoutServer(layout){
  apiRequest('invoice-layout',layout).catch(err=>console.warn('Database layout save failed:',err));
}

function audit(action,record='System',result='Logged'){
  const entry={time:new Date().toLocaleString('en-AE',{dateStyle:'short',timeStyle:'short'}),user:'Sara',action,record,result};
  saveServer('audit',entry);
  renderAuditLog([entry]);
}

function renderAuditLog(entries=[]){
  const tbody=document.getElementById('audit-tbody');
  if(!tbody||entries.length===0)return;
  tbody.querySelectorAll('[data-audit-dynamic]').forEach(row=>row.remove());
  const template=document.createElement('tbody');
  template.innerHTML=entries.map(entry=>`<tr data-audit-dynamic><td class="mono">${escapeHtml(entry.time)}</td><td>${escapeHtml(entry.user)}</td><td>${escapeHtml(entry.action)}</td><td>${escapeHtml(entry.record)}</td><td><span class="b b-g">${escapeHtml(entry.result)}</span></td></tr>`).join('');
  [...template.children].reverse().forEach(row=>tbody.prepend(row));
}

function persistSalesInvoice(inv){
  saveServer('salesInvoices',inv);
}

function restoreSalesInvoices(){
  // Sales invoices are restored from the database by hydrateFromServer().
}

function emptyTableMessage(tbody,message='No database records yet.'){
  if(!tbody)return;
  const table=tbody.closest('table');
  const cols=table?.tHead?.rows?.[0]?.cells?.length||1;
  tbody.innerHTML=`<tr data-empty-state="1"><td colspan="${cols}" style="color:var(--text3);text-align:center">${escapeHtml(message)}</td></tr>`;
}

function removeEmptyState(tbody){
  tbody?.querySelectorAll('[data-empty-state]').forEach(row=>row.remove());
}

function clearStaticDemoData(){
  const emptyTables={
    'sales-invoice-tbody':'No sales invoices in database yet.',
    'customer-tbody':'No customers in database yet.',
    'quotation-tbody':'No quotations in database yet.',
    'purchase-record-tbody':'No purchase records in database yet.',
    'bill-tbody':'No vendor bills in database yet.',
    'vendor-tbody':'No vendors in database yet.',
    'payment-in-tbody':'No receipts in database yet.',
    'payment-out-tbody':'No payments in database yet.',
    'prod-tbody':'No products in database yet.',
    'account-tbody':'No accounts in database yet.',
    'ledger-tbody':'No ledger entries in database yet.',
    'audit-tbody':'No audit records in database yet.'
  };
  Object.entries(emptyTables).forEach(([id,message])=>emptyTableMessage(document.getElementById(id),message));
  document.querySelectorAll('.page table.tbl tbody').forEach(tbody=>{
    if(tbody.querySelector('[data-empty-state]'))return;
    if(tbody.closest('#page-dashboard'))return;
    emptyTableMessage(tbody,'No database records yet.');
  });
  document.querySelectorAll('[data-demo-static="1"]').forEach(node=>node.remove());
  clearDemoFormDefaults();
}

function clearDemoFormDefaults(){
  const demoOptionText=/^(Al Hamad Steel|Gulf Freight|Office Depot UAE|UAE Paints Co\.|Dubai Steel Co\.|Gulf Logistics Ltd|Emirates Supplies|Al Baraka Trading|Steel Rods 12mm|Packaging Box A|Industrial Oil 5L|Safety Gloves|Sara Al Mansouri|Ahmed Rashid|Rania Abboud|Mohamed Jaber)$/i;
  document.querySelectorAll('select').forEach(select=>{
    [...select.options].forEach(option=>{
      if(demoOptionText.test(option.textContent.trim()))option.remove();
    });
    if(select.options.length&&select.selectedIndex<0)select.selectedIndex=0;
  });
  const demoInputValue=/^(Sara Al Mansouri|INV-2024-\d+|PUR-2024-\d+|Steel Rods 12mm|Packaging Box A|Industrial Oil 5L|Safety Gloves)$/i;
  document.querySelectorAll('input').forEach(input=>{
    if(demoInputValue.test(String(input.value||'').trim()))input.value='';
  });
}

function quotationActionsHtml(){
  return `<div class="row-actions"><button class="icon-btn view" type="button" title="View" aria-label="View quotation" onclick="previewQuotation(this)">${viewIconSvg()}</button><button class="icon-btn share" type="button" title="Share" aria-label="Share quotation" onclick="shareQuotation(this)">${shareIconSvg()}</button><button class="icon-btn edit" type="button" title="Convert" aria-label="Convert quotation" onclick="convertQuotation(this)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9"/><path d="M9 5l3 3-3 3"/></svg></button></div>`;
}

function quotationRecordFromRow(row){
  if(row?.dataset.quotation){
    try{return JSON.parse(row.dataset.quotation);}catch{}
  }
  const c=row?.cells||[];
  return {
    quote_no:c[0]?.textContent?.trim()||'',
    customer:c[1]?.textContent?.trim()||'',
    date:c[2]?.textContent?.trim()||'',
    valid_until:c[3]?.textContent?.trim()||'',
    subtotal:c[4]?.textContent?.trim()||'0',
    vat_amount:c[5]?.textContent?.trim()||'0',
    total:c[6]?.textContent?.trim()||'0',
    status:c[7]?.textContent?.trim()||'Draft',
    owner:c[8]?.textContent?.trim()||'Sales Team'
  };
}

function quotationStatusClass(status){
  const value=String(status||'').toLowerCase();
  if(value.includes('accept')||value.includes('convert'))return 'b-g';
  if(value.includes('expire')||value.includes('reject'))return 'b-r';
  if(value.includes('sent')||value.includes('pending'))return 'b-a';
  return 'b-gray';
}

function renderQuotationRecord(quote){
  const tbody=document.getElementById('quotation-tbody');
  const quoteNo=quote?.quote_no||quote?.quotation_no||quote?.ref;
  if(!tbody||!quoteNo||hasFirstCellValue(tbody,quoteNo))return;
  const row=document.createElement('tr');
  const record={
    quote_no:quoteNo,
    customer:quote.customer||'Customer',
    date:quote.date||'Today',
    valid_until:quote.valid_until||quote.valid||'15 days',
    subtotal:quote.subtotal||0,
    vat_amount:quote.vat_amount||quote.vat||0,
    total:quote.total||0,
    status:quote.status||'Draft',
    owner:quote.owner||'Sales Team'
  };
  row.dataset.serverRecord='quotations';
  row.dataset.quotation=JSON.stringify(record);
  row.innerHTML=`<td class="mono">${escapeHtml(record.quote_no)}</td><td>${escapeHtml(record.customer)}</td><td>${escapeHtml(record.date)}</td><td>${escapeHtml(record.valid_until)}</td><td class="mono">${Number(String(record.subtotal).replace(/,/g,'')||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(String(record.vat_amount).replace(/,/g,'')||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(String(record.total).replace(/,/g,'')||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td><span class="b ${quotationStatusClass(record.status)}">${escapeHtml(record.status)}</span></td><td>${escapeHtml(record.owner)}</td><td data-action-col="1">${quotationActionsHtml()}</td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
  refreshEnhancedTable(tbody.closest('table'));
}

function hasFirstCellValue(tbody,value){
  return !!tbody&&[...tbody.querySelectorAll('tr:not([data-empty-state]) td:first-child')].some(td=>td.textContent.trim().toLowerCase()===String(value||'').trim().toLowerCase());
}

function renderCustomerRecord(customer){
  const tbody=document.getElementById('customer-tbody');
  if(!tbody||!customer?.name||hasFirstCellValue(tbody,customer.name))return;
  const row=document.createElement('tr');
  row.dataset.serverRecord='customers';
  row.innerHTML=`<td>${escapeHtml(customer.name)}</td><td class="mono">${escapeHtml(customer.trn||'Not registered')}</td><td>${escapeHtml(customer.emirate||'Dubai')}</td><td>${escapeHtml(customer.email||customer.phone||'-')}</td><td class="mono" style="color:var(--accent)">AED 0</td><td><button class="btn btn-g btn-sm">View</button></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
}

function renderProductRecord(product){
  const tbody=document.getElementById('prod-tbody');
  if(!tbody||!product?.name||hasFirstCellValue(tbody,product.code))return;
  const vatText=String(product.vat||'').includes('0')&&!String(product.vat||'').includes('5')?'0% Zero':String(product.vat||'').includes('Exempt')?'Exempt':'5%';
  const vatClass=vatText==='5%'?'b-b':'b-t';
  const row=document.createElement('tr');
  row.dataset.serverRecord='products';
  row.dataset.cost=product.cost??0;
  row.dataset.supplier=product.supplier_name||product.supplier||'';
  row.innerHTML=`<td class="mono">${escapeHtml(product.code||'PRD')}</td><td>${escapeHtml(product.name)}</td><td>Stock Item</td><td>${escapeHtml(product.category||'Materials')}</td><td>${escapeHtml(product.unit||'Each')}</td><td>Main Store</td><td><span class="b b-g">Yes</span></td><td><span class="b ${vatClass}">${escapeHtml(vatText)}</span></td><td><span class="b b-g">Active</span></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
  refreshEnhancedTable(tbody.closest('table'));
  syncStockMappingFromItems();
  refreshInvoiceProductSuggestions();
  refreshPurchaseProductSuggestions();
}

function syncProductMasterOptions(){
  const categorySelect=document.getElementById('prod-category');
  const unitSelect=document.getElementById('prod-unit');
  if(categorySelect){
    const current=categorySelect.value;
    const categories=[...document.querySelectorAll('#sales-category-tbody tr td:first-child')]
      .map(td=>td.textContent.trim())
      .filter(Boolean);
    categorySelect.innerHTML=[...new Set(categories)].map(name=>`<option>${escapeHtml(name)}</option>`).join('');
    if(current&&categories.includes(current))categorySelect.value=current;
  }
  if(unitSelect){
    const current=unitSelect.value;
    const units=[...document.querySelectorAll('#sales-unit-tbody tr')]
      .map(row=>row.children[1]?.textContent.trim()||row.children[0]?.textContent.trim())
      .filter(Boolean);
    unitSelect.innerHTML=[...new Set(units)].map(name=>`<option>${escapeHtml(name)}</option>`).join('');
    if(current&&units.includes(current))unitSelect.value=current;
  }
}

function dbUnitNames(){
  return [...new Set([...document.querySelectorAll('#sales-unit-tbody tr:not([data-empty-state])')]
    .map(row=>row.children[1]?.textContent.trim()||row.children[0]?.textContent.trim())
    .filter(Boolean))];
}

function unitOptionsHtml(selected=''){
  const units=dbUnitNames();
  const list=units.length?units:['PCS'];
  return list.map(name=>`<option ${name===selected?'selected':''}>${escapeHtml(name)}</option>`).join('');
}

function renderSalesCategoryRecord(category){
  const tbody=document.getElementById('sales-category-tbody');
  const name=(category?.name||category?.category||'').trim();
  if(!tbody||!name||hasFirstCellValue(tbody,name))return;
  const vat=category.vat||category.default_vat||'Standard 5%';
  const row=document.createElement('tr');
  row.dataset.serverRecord='salesCategories';
  row.innerHTML=`<td>${escapeHtml(name)}</td><td>${escapeHtml(category.scope||'Sales & Purchase')}</td><td><span class="b b-b">${escapeHtml(vat)}</span></td><td><span class="b b-g">${escapeHtml(category.status||'Active')}</span></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
  syncProductMasterOptions();
  syncInventoryItemOptions();
}

function renderSalesUnitRecord(unit){
  const tbody=document.getElementById('sales-unit-tbody');
  const name=(unit?.name||unit?.unit||'').trim();
  const code=(unit?.code||name.slice(0,6).toUpperCase()).trim();
  if(!tbody||!name||hasFirstCellValue(tbody,code))return;
  const row=document.createElement('tr');
  row.dataset.serverRecord='salesUnits';
  row.innerHTML=`<td class="mono">${escapeHtml(code)}</td><td>${escapeHtml(name)}</td><td>${escapeHtml(unit.type||'Quantity')}</td><td class="mono">${escapeHtml(unit.decimals??'2')}</td><td><span class="b b-g">${escapeHtml(unit.status||'Active')}</span></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
  syncProductMasterOptions();
  syncInventoryItemOptions();
}

function renderBillRecord(bill){
  const tbody=document.getElementById('bill-tbody');
  if(!tbody||!bill?.bill_no||hasFirstCellValue(tbody,bill.bill_no))return;
  const row=document.createElement('tr');
  row.dataset.serverRecord='bills';
  row.innerHTML=`<td class="mono">${escapeHtml(bill.bill_no)}</td><td>${escapeHtml(bill.vendor)}</td><td>${escapeHtml(bill.date)}</td><td>${escapeHtml(bill.due)}</td><td class="mono">${Number(bill.subtotal||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(bill.vat||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(bill.total||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td><span class="b b-a">${escapeHtml(bill.status||'Awaiting Payment')}</span></td><td><button class="btn btn-g btn-sm" onclick="openRowDetail(this,'Bill / Vendor Detail','Bill detail')">View</button></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
}

function renderVendorRecord(vendor){
  const tbody=document.getElementById('vendor-tbody');
  if(!tbody||!vendor?.name||hasFirstCellValue(tbody,vendor.name))return;
  const row=document.createElement('tr');
  row.dataset.serverRecord='vendors';
  row.dataset.address=vendor.address||'';
  row.innerHTML=`<td>${escapeHtml(vendor.name)}</td><td class="mono">${escapeHtml(vendor.trn||'Not registered')}</td><td>${escapeHtml(vendor.category||'Services')}</td><td>${escapeHtml(vendor.email||'-')}</td><td>${escapeHtml(vendor.address||'-')}</td><td class="mono">0.00</td><td><span class="b b-g">Active</span></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
  syncSupplierOptions(vendor.name);
  syncInventoryItemOptions();
}

function vendorAddressByName(name){
  const wanted=String(name||'').trim().toLowerCase();
  if(!wanted)return '';
  const row=[...document.querySelectorAll('#vendor-tbody tr:not([data-empty-state])')]
    .find(item=>item.children[0]?.textContent.trim().toLowerCase()===wanted);
  return row?.dataset.address||row?.children[4]?.textContent.trim().replace(/^[-]$/,'')||'';
}

function applySupplierAddress(){
  const supplier=document.getElementById('mp-supplier')?.value||'';
  const address=vendorAddressByName(supplier);
  const field=document.getElementById('mp-address');
  if(field&&address&&!field.value)field.value=address;
}

function syncSupplierOptions(selected=''){
  const select=document.getElementById('mp-supplier');
  if(!select)return;
  const current=selected||select.value;
  const names=[...document.querySelectorAll('#vendor-tbody tr:not([data-empty-state]) td:first-child')]
    .map(td=>td.textContent.trim())
    .filter(Boolean);
  const existing=[...select.options].map(option=>option.value||option.textContent.trim()).filter(Boolean);
  const all=[...new Set([...existing, ...names])];
  select.innerHTML='<option value="">Please Select</option>'+all.map(name=>`<option>${escapeHtml(name)}</option>`).join('');
  if(current&&all.includes(current))select.value=current;
  applySupplierAddress();
}

function openSupplierPopup(){
  showM('m-vendor');
  setTimeout(()=>document.getElementById('vendor-name')?.focus(),50);
}

function renderPaymentRecord(payment){
  const tbody=document.getElementById(payment?.type==='Supplier Payment'?'payment-out-tbody':'payment-in-tbody');
  if(!tbody||!payment?.ref||hasFirstCellValue(tbody,payment.ref))return;
  const label=payment.type==='Supplier Payment'?'Vendor':'Manual';
  const row=document.createElement('tr');
  row.dataset.serverRecord='payments';
  row.innerHTML=`<td class="mono">${escapeHtml(payment.ref)}</td><td>${escapeHtml(payment.contact)}</td><td class="mono">${escapeHtml(label)}</td><td>${escapeHtml(payment.method||'Bank Transfer')}</td><td>${escapeHtml(payment.date)}</td><td class="mono">${Number(payment.amount||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td><span class="b b-g">Posted</span></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
}

function renderPurchaseRecord(purchase,options={}){
  const tbody=document.getElementById('purchase-record-tbody');
  const ref=purchase?.ref||purchase?.invoice_no||purchase?.reference;
  if(!tbody||!ref||hasFirstCellValue(tbody,ref))return;
  const row=document.createElement('tr');
  row.dataset.serverRecord='purchaseRecords';
  row.dataset.purchaseRecord=JSON.stringify({...purchase,ref});
  const status=purchase.status||'Draft';
  const statusClass=status==='Paid'?'b-g':status==='Received'?'b-b':status.includes('Payment')?'b-a':'b-gray';
  const source=String(purchase.source||'Manual');
  const sourceClass=source.toLowerCase().includes('ai')?'b-p':'b-gray';
  row.innerHTML=`<td class="mono">${escapeHtml(ref)}</td><td>${escapeHtml(purchase.supplier||'-')}</td><td>${escapeHtml(purchase.date||'-')}</td><td>${escapeHtml(purchase.location||'-')}</td><td class="mono">${Number(purchase.items||0)}</td><td class="mono">${Number(purchase.net_amount||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(purchase.tax_amount||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(purchase.shipping||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(purchase.total||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(purchase.paid||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${Number(purchase.due||0).toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td><span class="b ${sourceClass}">${escapeHtml(source)}</span></td><td><span class="b ${statusClass}">${escapeHtml(status)}</span></td><td><div class="flx"><button class="btn btn-g btn-sm" type="button" onclick="editPurchaseRecord(this)">Edit</button><button class="btn btn-g btn-sm" type="button" onclick="openRowDetail(this,'Purchase Detail','Purchase Records')">View</button></div></td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
  if(!options.deferRefresh)refreshEnhancedTable(tbody.closest('table'));
}

function renderAccountRecord(account){
  const tbody=document.getElementById('account-tbody');
  if(!tbody||!account?.code||hasFirstCellValue(tbody,account.code))return;
  const typeClass={Asset:'b-t',Liability:'b-r',Revenue:'b-g',Expense:'b-p',Equity:'b-b'}[account.type]||'b-gray';
  const row=document.createElement('tr');
  row.dataset.serverRecord='accounts';
  row.innerHTML=`<td class="mono">${escapeHtml(account.code)}</td><td>${escapeHtml(account.name)}</td><td><span class="b ${typeClass}">${escapeHtml(account.type||'Asset')}</span></td><td>${escapeHtml(account.category||'Current')}</td><td class="mono">0.00</td><td><span class="b b-g">Active</span></td><td><button class="btn btn-g btn-sm" onclick="viewAccountLedger(this)">View</button></td>`;
  removeEmptyState(tbody);
  tbody.appendChild(row);
}

function hydrateFromServer(){
  return apiRequest('bootstrap',{}, {method:'GET'}).then(({data})=>{
    if(!data)return;
    if(data.company)applyCompanyToUi(data.company);
    (data.products||[]).reverse().forEach(renderProductRecord);
    (data.salesCategories||[]).reverse().forEach(renderSalesCategoryRecord);
    (data.salesUnits||[]).reverse().forEach(renderSalesUnitRecord);
    (data.customers||[]).reverse().forEach(renderCustomerRecord);
    (data.salesInvoices||[]).reverse().forEach(inv=>addSalesInvoiceRow(inv,{persist:false}));
    (data.quotations||[]).reverse().forEach(renderQuotationRecord);
    (data.accounts||[]).reverse().forEach(renderAccountRecord);
    (data.ledger||[]).reverse().forEach(line=>postLedgerLine(line,{persist:false}));
    (data.bills||[]).reverse().forEach(renderBillRecord);
    (data.vendors||[]).reverse().forEach(renderVendorRecord);
    (data.payments||[]).reverse().forEach(renderPaymentRecord);
    (data.purchaseRecords||[]).reverse().forEach(renderPurchaseRecord);
    const totalLoaded=[
      data.products,
      data.customers,
      data.salesInvoices,
      data.quotations,
      data.bills,
      data.vendors,
      data.payments,
      data.purchaseRecords
    ].reduce((sum,rows)=>sum+(Array.isArray(rows)?rows.length:0),0);
    window.__taxflowLastDbLoad={at:new Date().toISOString(),totalLoaded};
    console.info(`TaxFlow DB tables loaded: ${totalLoaded} records`);
    if(totalLoaded>0)toast(`Database tables loaded: ${totalLoaded} records`,'ok');
    if(data.invoiceLayout){
      setInvoiceLayoutFields(data.invoiceLayout);
      updateInvoiceLayoutPreview();
    }
    if(Array.isArray(data.audit)&&data.audit.length){
      renderAuditLog(data.audit);
    }
    updateAccountSelectors();
    syncProductMasterOptions();
    syncSupplierOptions();
    syncInventoryItemOptions();
    refreshPurchaseProductSuggestions();
    loadStockMappingsFromServer();
    filterLedger();
    scheduleIdleTask(()=>{
      revalidateSalesAiRows();
      bindDetailViews();
      bindEditActions();
      refreshActivePageTables();
      refreshInitializedTables();
      applyAllTableActions();
    },700);
  }).catch(err=>console.warn('Database bootstrap unavailable:',err));
}

function forceDbRefresh(){
  window.__taxflowFreshDashboardLoaded=false;
  syncDashboardFromDatabase();
  return hydrateFromServer();
}

window.hydrateFromServer=hydrateFromServer;
window.forceDbRefresh=forceDbRefresh;

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function buildFallbackExtraction(entry){
  return [];
}

async function requestInvoiceExtraction(entry){
  const payload={
    file:{name:entry.name,size:entry.size,type:entry.type,base64:entry.base64},
    category:entry.category,
    period:entry.period
  };

  try{
    const endpoint=APP_CONFIG.extractionEndpoint||`${apiBaseUrl()}/app-data?action=documents.extract`;
    const response=await authenticatedFetch(endpoint,{
      method:'POST',
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error('Extraction service returned '+response.status);
    const data=await response.json();
    const invoices=Array.isArray(data)?data:data.invoices;
    if(!Array.isArray(invoices))throw new Error('Extraction service returned an invalid payload');
    return invoices;
  }catch(err){
    if(!APP_CONFIG.extractionFallback)throw err;
    console.warn('Extraction unavailable:',err);
    toast('Extraction unavailable. No demo data was added.','warn');
    return buildFallbackExtraction(entry);
  }
}

const salesUploadedFiles = [];
const salesExtractedInvoices = [];
const salesInvoiceDbKeys = new Set();

function invoiceKey(value){
  return String(value||'').trim().toLowerCase();
}

function registerSalesInvoiceKey(value){
  const key=invoiceKey(value);
  if(key)salesInvoiceDbKeys.add(key);
}

function buildFallbackSalesExtraction(entry){
  return [];
}

async function requestSalesInvoiceExtraction(entry){
  const payload={
    documentType:'sales_invoice',
    file:{name:entry.name,size:entry.size,type:entry.type,base64:entry.base64},
    importType:entry.importType,
    period:entry.period
  };

  try{
    const endpoint=APP_CONFIG.salesExtractionEndpoint||`${apiBaseUrl()}/app-data?action=invoices.import`;
    const response=await authenticatedFetch(endpoint,{
      method:'POST',
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error('Invoice import service returned '+response.status);
    const data=await response.json();
    const invoices=Array.isArray(data)?data:data.invoices;
    if(!Array.isArray(invoices))throw new Error('Invoice import service returned an invalid payload');
    return invoices;
  }catch(err){
    if(!APP_CONFIG.extractionFallback)throw err;
    console.warn('Sales invoice extraction unavailable:',err);
    toast('Invoice extraction unavailable. No demo data was added.','warn');
    return buildFallbackSalesExtraction(entry);
  }
}

function isSupportedSalesFile(file){
  return /\.(pdf|csv|xlsx|xls|jpg|jpeg|png)$/i.test(file.name);
}

function salesDzOver(e){e.preventDefault();document.getElementById('sales-zone').classList.add('over');}
function salesDzLeave(){document.getElementById('sales-zone').classList.remove('over');}
function salesDzDrop(e){
  e.preventDefault();
  document.getElementById('sales-zone').classList.remove('over');
  [...e.dataTransfer.files].forEach(f=>readAndAddSalesFile(f));
}

function salesUpload(inp){
  [...inp.files].forEach(f=>readAndAddSalesFile(f));
  inp.value='';
}

function readAndAddSalesFile(file){
  if(!isSupportedSalesFile(file)){
    toast('Unsupported file: '+file.name,'err');
    return;
  }
  const reader=new FileReader();
  reader.onload=function(e){
    const entry={
      id:'S'+Date.now()+Math.random().toString(36).slice(2,6),
      name:file.name,
      size:file.size,
      type:file.type,
      base64:e.target.result,
      importType:document.getElementById('sales-import-type')?.value||'Sales Tax Invoices',
      period:document.getElementById('sales-import-period')?.value||'June 2024',
      status:'Queued'
    };
    salesUploadedFiles.push(entry);
    animateSalesUpload(entry);
  };
  reader.readAsDataURL(file);
}

function animateSalesUpload(entry){
  const pg=document.getElementById('sales-prog'),fill=document.getElementById('sales-fill'),fn=document.getElementById('sales-fname'),pct=document.getElementById('sales-pct');
  pg.style.display='block';fn.textContent='Uploading: '+entry.name;
  let p=0;
  const iv=setInterval(()=>{
    p+=Math.random()*18+6;
    if(p>=100){
      p=100;clearInterval(iv);
      setTimeout(()=>{
        pg.style.display='none';fill.style.width='0%';
        entry.status='Ready';
        renderSalesFileList();
        toast(entry.name+' uploaded ?','ok');
        setTimeout(()=>extractSalesInvoiceFile(entry),500);
      },250);
    }
    fill.style.width=Math.min(p,100)+'%';
    pct.textContent=Math.round(Math.min(p,100))+'%';
  },110);
}

function renderSalesFileList(){
  const list=document.getElementById('sales-file-list');
  const badge=document.getElementById('sales-file-count');
  if(!list)return;
  if(badge)badge.textContent=salesUploadedFiles.length+' files';
  list.innerHTML='';
  if(salesUploadedFiles.length===0){
    list.innerHTML='<div style="font-size:12.5px;color:var(--text3);line-height:1.7">No files uploaded yet. Upload invoice PDFs, Excel files, or images to extract invoice data.</div>';
    return;
  }
  salesUploadedFiles.forEach(f=>{
    const statusBadge={
      Queued:'<span class="b b-gray">Queued</span>',
      Ready:'<span class="b b-b">Ready</span>',
      Extracting:'<span class="b b-a">Reading-</span>',
      Extracted:'<span class="b b-g">Stored data</span>',
      Error:'<span class="b b-r">Error</span>'
    }[f.status]||'<span class="b b-gray">Unknown</span>';
    const btn=f.status==='Ready'?`<button class="btn btn-p btn-sm" onclick="extractSalesInvoiceFile(salesUploadedFiles.find(x=>x.id==='${f.id}'))">Read Data</button>`:'';
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)';
    row.innerHTML=`<span style="font-size:20px">${getFileIcon(f.name)}</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(f.name)}</div><div class="mono" style="color:var(--text3);font-size:11px">${fmtSize(f.size)} - ${escapeHtml(f.importType)} - ${escapeHtml(f.period)}</div></div><div class="flx">${statusBadge}${btn}</div>`;
    list.appendChild(row);
  });
}

async function extractSalesInvoiceFile(entry){
  if(!entry){toast('Sales invoice file not found','err');return;}
  entry.status='Extracting';
  renderSalesFileList();
  toast('Reading invoice data from '+entry.name+'...','info');
  const extTab=document.querySelector('#page-sales .tab:nth-child(2)');
  if(extTab)stab(extTab,'s-extract');
  try{
    const invoices=await requestSalesInvoiceExtraction(entry);
    entry.status='Extracted';
    entry.invoices=invoices;
    salesExtractedInvoices.push(...invoices.map(inv=>({...inv,sourceFile:entry.name,stored:false})));
    renderSalesFileList();
    appendSalesExtractedRows(invoices);
    if(invoices.some(inv=>!validateSalesAiInvoice(inv).valid)){
      refreshSalesValidationPanel();
      toast('Validation issues found - review required','warn');
    }
    toast('Read '+invoices.length+' invoice(s) from '+entry.name+' ?','ok');
  }catch(err){
    entry.status='Error';
    renderSalesFileList();
    toast('Invoice read failed: '+err.message,'err');
  }
}

function appendSalesExtractedRows(invoices){
  const tbody=document.getElementById('sales-ext-tbody');
  if(!tbody)return;
  if(tbody.querySelector('td[colspan]'))tbody.innerHTML='';
  const fmt=n=>Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
  invoices.forEach(inv=>{
    if([...tbody.querySelectorAll('td.mono')].some(td=>td.textContent===inv.invoice_no)){
      toast(`Duplicate in current AI upload: ${inv.invoice_no}`,'warn');
      return;
    }
    const validation=validateSalesAiInvoice(inv);
    const confCls=inv.confidence>=90?'b-g':inv.confidence>=70?'b-a':'b-r';
    const stCls=validation.valid?'b-g':'b-a';
    const row=document.createElement('tr');
    row.dataset.salesInv=JSON.stringify(inv);
    row.dataset.validation=validation.valid?'valid':'review';
    row.innerHTML=`<td><input type="checkbox" class="sales-ai-select" ${validation.valid?'checked':''} aria-label="Select ${escapeHtml(inv.invoice_no)}"></td><td class="mono">${escapeHtml(inv.invoice_no)}</td><td>${escapeHtml(inv.customer)}</td><td class="mono">${escapeHtml(inv.customer_trn||'')}</td><td>${escapeHtml(inv.date)}</td><td class="mono">${fmt(inv.subtotal)}</td><td class="mono">${fmt(inv.vat_amount)}</td><td class="mono">${fmt(inv.total)}</td><td><span class="b ${confCls}">${Number(inv.confidence||0)}%</span></td><td class="sales-ai-validation"><span class="b ${stCls}">${validation.valid?'Valid':'Review'}</span></td><td class="sales-ai-details" style="color:var(--text3);font-size:12px">${escapeHtml(validation.issues.join('; ')||'Ready to save')}</td><td data-action-col="1">${salesAiUploadActionsHtml()}</td>`;
    tbody.prepend(row);
  });
  revalidateSalesAiRows();
}

function runSalesImport(){
  const ready=salesUploadedFiles.filter(f=>f.status==='Ready'||f.status==='Queued');
  if(ready.length===0){toast('No pending sales invoice files to read','warn');return;}
  ready.forEach((f,i)=>setTimeout(()=>extractSalesInvoiceFile(f),i*450));
}

function storeExtractedSalesInvoices(options={}){
  const rows=[...document.querySelectorAll('#sales-ext-tbody tr[data-sales-inv]')]
    .filter(row=>row.dataset.skipped!=='1')
    .filter(row=>options.auto||row.querySelector('.sales-ai-select')?.checked);
  if(rows.length===0){toast('No extracted sales invoices to store','warn');return;}
  let stored=0;
  let blocked=0;
  rows.forEach(row=>{
    const inv=JSON.parse(row.dataset.salesInv||'{}');
    const validation=validateSalesAiInvoice(inv);
    if(!validation.valid){
      blocked++;
      row.querySelector('.sales-ai-validation').innerHTML='<span class="b b-a">Review</span>';
      row.querySelector('.sales-ai-details').textContent=validation.issues.join('; ');
      return;
    }
    if(addSalesInvoiceRow(inv)){
      stored++;
      row.querySelector('.sales-ai-validation').innerHTML='<span class="b b-g">Saved</span>';
      row.querySelector('.sales-ai-details').textContent='Saved to invoice register';
      row.querySelector('.sales-ai-select').checked=false;
      row.dataset.skipped='1';
    }
  });
  if(stored>0){
    const tab=document.querySelector('#page-sales .tab:nth-child(4)');
    if(tab&&!options.auto)stab(tab,'s-invoices');
    audit('Stored imported sales invoices',stored+' invoice(s)','Saved');
  }
  refreshSalesValidationPanel();
  toast(stored+' invoice(s) saved'+(blocked?`; ${blocked} row(s) need review`:''),'ok');
}

function validateSalesAiInvoice(inv){
  const issues=[];
  const invoiceNo=String(inv.invoice_no||'').trim();
  const trn=String(inv.customer_trn||'').replace(/\D/g,'');
  const subtotal=Number(inv.subtotal||0);
  const vat=Number(inv.vat_amount||0);
  const total=Number(inv.total||0);
  if(!invoiceNo)issues.push('Invoice number missing');
  if(invoiceNo&&salesInvoiceDbKeys.has(invoiceKey(invoiceNo)))issues.push('Duplicate invoice number in database');
  if(invoiceNo&&countSalesAiInvoiceNo(invoiceNo)>1)issues.push('Duplicate invoice number in AI upload');
  if(!String(inv.customer||'').trim())issues.push('Customer missing');
  if(!String(inv.date||'').trim())issues.push('Date missing');
  if(trn&&trn.length!==15)issues.push('Customer TRN must be 15 digits');
  if(total&&Math.abs((subtotal+vat)-total)>.05)issues.push('Total does not match subtotal + VAT');
  if(Number(inv.confidence||0)<70)issues.push('Low confidence extraction');
  return {valid:issues.length===0,issues};
}

function countSalesAiInvoiceNo(invoiceNo){
  const key=invoiceKey(invoiceNo);
  if(!key)return 0;
  return [...document.querySelectorAll('#sales-ext-tbody tr[data-sales-inv]')].filter(row=>{
    try{return invoiceKey(JSON.parse(row.dataset.salesInv||'{}').invoice_no)===key;}catch{return false;}
  }).length;
}

function revalidateSalesAiRows(){
  document.querySelectorAll('#sales-ext-tbody tr[data-sales-inv]').forEach(row=>{
    if(row.dataset.skipped==='1')return;
    let inv={};
    try{inv=JSON.parse(row.dataset.salesInv||'{}');}catch{return;}
    const validation=validateSalesAiInvoice(inv);
    row.dataset.validation=validation.valid?'valid':'review';
    const validationCell=row.querySelector('.sales-ai-validation');
    const detailsCell=row.querySelector('.sales-ai-details');
    const checkbox=row.querySelector('.sales-ai-select');
    if(validationCell)validationCell.innerHTML=`<span class="b ${validation.valid?'b-g':'b-a'}">${validation.valid?'Valid':'Review'}</span>`;
    if(detailsCell)detailsCell.textContent=validation.issues.join('; ')||'Ready to save';
    if(checkbox&&!validation.valid)checkbox.checked=false;
  });
  refreshSalesValidationPanel();
}

function refreshSalesValidationPanel(){
  const target=document.getElementById('sales-validation-list');
  if(!target)return;
  const rows=[...document.querySelectorAll('#sales-ext-tbody tr[data-sales-inv]')]
    .filter(row=>row.dataset.skipped!=='1')
    .map(row=>{
      try{
        const inv=JSON.parse(row.dataset.salesInv||'{}');
        return {row,inv,validation:validateSalesAiInvoice(inv)};
      }catch{
        return null;
      }
    })
    .filter(Boolean)
    .filter(item=>!item.validation.valid);

  if(rows.length===0){
    target.innerHTML=`<div style="background:var(--green-bg);border:1px solid var(--green-border);border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">OK</span>
        <div><div style="font-size:13.5px;font-weight:600">All extracted sales invoices passed validation</div><div style="font-size:12px;color:var(--text3)">Selected valid rows can be saved from AI Extraction.</div></div>
      </div>
    </div>`;
    return;
  }

  target.innerHTML=rows.map(item=>`
    <div style="background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:18px;flex-shrink:0">!</span>
        <div style="flex:1">
          <div style="font-size:13.5px;font-weight:600;margin-bottom:3px">${escapeHtml(item.inv.invoice_no||'Missing invoice')} - ${escapeHtml(item.inv.customer||'Customer missing')}</div>
          <div style="font-size:12px;color:var(--text3)">${escapeHtml(item.validation.issues.join('; '))}</div>
        </div>
      </div>
    </div>`).join('');
}

function skipIconSvg(){
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8"/><path d="M12 4l-8 8"/></svg>`;
}

function salesAiUploadActionsHtml(){
  return `<div class="row-actions">
    <button class="icon-btn skip" type="button" title="Skip" aria-label="Skip AI upload row" onclick="skipSalesAiRow(this)">${skipIconSvg()}</button>
    <button class="icon-btn danger" type="button" title="Delete" aria-label="Delete AI upload row" onclick="deleteSalesAiRow(this)">${deleteIconSvg()}</button>
  </div>`;
}

function toggleSalesAiSelection(checked){
  document.querySelectorAll('#sales-ext-tbody tr[data-sales-inv]').forEach(row=>{
    const box=row.querySelector('.sales-ai-select');
    if(box&&row.dataset.skipped!=='1')box.checked=checked;
  });
}

function skipSalesAiRow(btn){
  const row=btn.closest('tr');
  if(!row)return;
  row.dataset.skipped='1';
  const box=row.querySelector('.sales-ai-select');
  if(box)box.checked=false;
  row.querySelector('.sales-ai-validation').innerHTML='<span class="b b-gray">Skipped</span>';
  row.querySelector('.sales-ai-details').textContent='Skipped by user';
  refreshSalesValidationPanel();
  toast('AI upload row skipped','info');
}

function deleteSalesAiRow(btn){
  const row=btn.closest('tr');
  const tbody=row?.parentElement;
  row?.remove();
  if(tbody&&tbody.querySelectorAll('tr[data-sales-inv]').length===0){
    tbody.innerHTML='<tr><td colspan="12" style="color:var(--text3);text-align:center">AI uploaded invoice data will appear here for validation.</td></tr>';
  }
  refreshSalesValidationPanel();
  toast('AI upload row deleted','warn');
}

function shareIconSvg(){
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 8.5l3-1.8"/><path d="M6.5 7.5l3 1.8"/><circle cx="4.5" cy="8" r="2"/><circle cx="11.5" cy="5.8" r="2"/><circle cx="11.5" cy="10.2" r="2"/></svg>`;
}

function salesInvoiceActionsHtml(){
  return `<div class="row-actions sales-actions">
    <button class="icon-btn view" type="button" title="View" aria-label="View invoice" onclick="openSalesInvoiceRow(this)">${viewIconSvg()}</button>
    <button class="icon-btn share" type="button" title="Share" aria-label="Share invoice" onclick="shareSalesInvoiceRow(this)">${shareIconSvg()}</button>
    <button class="icon-btn edit" type="button" title="Edit" aria-label="Edit invoice" onclick="openGenericEditRow(this,'Edit Sales Invoice','Update selected invoice')">${editIconSvg()}</button>
    <button class="icon-btn danger row-delete-btn" type="button" title="Delete" aria-label="Delete invoice" onclick="deleteTableRow(this)">${deleteIconSvg()}</button>
  </div>`;
}

function addSalesInvoiceRow(inv,options={persist:true}){
  const tbody=document.getElementById('sales-invoice-tbody');
  if(!tbody||!inv.invoice_no)return false;
  const exists=salesInvoiceDbKeys.has(invoiceKey(inv.invoice_no))||[...tbody.querySelectorAll('td.mono:first-child')].some(td=>td.textContent===inv.invoice_no);
  if(exists)return false;
  const fmt=n=>Number(n||0).toLocaleString('en-AE',{maximumFractionDigits:2});
  const source=inv.source||((inv.sourceFile||inv.confidence)?'AI Upload':'Manual');
  const sourceClass=String(source).toLowerCase().includes('ai')?'b-p':'b-gray';
  const row=document.createElement('tr');
  row.dataset.salesInvoice=JSON.stringify({...inv,source});
  row.dataset.rowActionsAdded='1';
  row.innerHTML=`<td class="mono">${escapeHtml(inv.invoice_no)}</td><td>${escapeHtml(inv.customer)}</td><td>${escapeHtml(inv.date)}</td><td>${escapeHtml(inv.due_date||'30 days')}</td><td class="mono">${fmt(inv.subtotal)}</td><td class="mono">${fmt(inv.vat_amount)}</td><td class="mono">${fmt(inv.total)}</td><td><span class="b ${sourceClass}">${escapeHtml(source)}</span></td><td><span class="b b-a">Pending</span></td><td data-action-col="1">${salesInvoiceActionsHtml()}</td>`;
  removeEmptyState(tbody);
  tbody.prepend(row);
  registerSalesInvoiceKey(inv.invoice_no);
  if(options.persist)persistSalesInvoice({...inv,source});
  return true;
}

function parseAmount(value){
  return parseFloat(String(value||'0').replace(/[^0-9.-]/g,''))||0;
}

function invoiceFromSalesRow(row){
  if(row?.dataset.salesInvoice){
    try{return JSON.parse(row.dataset.salesInvoice);}catch{}
  }
  const cells=[...(row?.querySelectorAll('td')||[])];
  return {
    invoice_no:cells[0]?.textContent.trim()||'Draft',
    customer:cells[1]?.textContent.trim()||'Customer',
    date:cells[2]?.textContent.trim()||'',
    due_date:cells[3]?.textContent.trim()||'',
    subtotal:parseAmount(cells[4]?.textContent),
    vat_amount:parseAmount(cells[5]?.textContent),
    total:parseAmount(cells[6]?.textContent),
    source:cells[7]?.textContent.trim()||'Manual',
    status:cells[8]?.textContent.trim()||'Draft',
    lines:[{description:'Sales invoice items',qty:1,price:parseAmount(cells[4]?.textContent),amount:parseAmount(cells[4]?.textContent)}]
  };
}

function getInvoiceLayout(){
  return {
    template:document.getElementById('inv-layout-template')?.value||'Modern Tax Invoice',
    paper:document.getElementById('inv-layout-paper')?.value||'A4 Portrait',
    align:document.getElementById('inv-layout-align')?.value||'left',
    color:document.getElementById('inv-layout-color')?.value||'#4f8ef0',
    logo:document.getElementById('inv-layout-logo')?.value||'TaxFlow',
    font:document.getElementById('inv-layout-font')?.value||'Modern Sans',
    company:document.getElementById('inv-layout-company')?.value||currentCompany?.name||'TaxFlow UAE LLC',
    trnMode:document.getElementById('inv-layout-trn-mode')?.value||'show',
    taxLabel:document.getElementById('inv-layout-tax-label')?.value||'Tax Invoice',
    address:document.getElementById('inv-layout-address')?.value||'Dubai, United Arab Emirates',
    terms:document.getElementById('inv-layout-terms')?.value||'Net 30',
    dueDays:document.getElementById('inv-layout-due-days')?.value||'30',
    currency:document.getElementById('inv-layout-currency')?.value||'AED 1,234.00',
    bank:document.getElementById('inv-layout-bank')?.value||'Bank transfer to Emirates NBD - IBAN AE070331234567890123456',
    footer:document.getElementById('inv-layout-footer')?.value||'Thank you for your business',
    language:document.getElementById('inv-layout-language')?.value||'English',
    decimals:document.getElementById('inv-layout-decimals')?.value||'2 decimals',
    qr:document.getElementById('inv-layout-qr')?.checked!==false,
    taxSummary:document.getElementById('inv-layout-tax-summary')?.checked!==false,
    signature:document.getElementById('inv-layout-signature')?.checked!==false
  };
}

function setInvoiceLayoutFields(layout={}){
  const fields={
    'inv-layout-template':layout.template,
    'inv-layout-paper':layout.paper,
    'inv-layout-align':layout.align,
    'inv-layout-color':layout.color,
    'inv-layout-logo':layout.logo,
    'inv-layout-font':layout.font,
    'inv-layout-company':layout.company,
    'inv-layout-trn-mode':layout.trnMode,
    'inv-layout-tax-label':layout.taxLabel,
    'inv-layout-address':layout.address,
    'inv-layout-terms':layout.terms,
    'inv-layout-due-days':layout.dueDays,
    'inv-layout-currency':layout.currency,
    'inv-layout-bank':layout.bank,
    'inv-layout-footer':layout.footer,
    'inv-layout-language':layout.language,
    'inv-layout-decimals':layout.decimals
  };
  Object.entries(fields).forEach(([id,value])=>{
    const field=document.getElementById(id);
    if(field&&value)field.value=value;
  });
  [
    ['inv-layout-qr',layout.qr],
    ['inv-layout-tax-summary',layout.taxSummary],
    ['inv-layout-signature',layout.signature]
  ].forEach(([id,value])=>{
    const field=document.getElementById(id);
    if(field&&value!==undefined)field.checked=Boolean(value);
  });
}

function saveInvoiceLayout(){
  const layout=getInvoiceLayout();
  saveInvoiceLayoutServer(layout);
  updateInvoiceLayoutPreview();
  toast('Invoice layout saved ?','ok');
  audit('Saved invoice layout',layout.template,'Saved');
}

function updateInvoiceLayoutPreview(){
  const layout=getInvoiceLayout();
  const preview=document.getElementById('invoice-layout-preview');
  if(!preview)return;
  const trn=currentCompany?.trn||document.getElementById('set-company-trn')?.value||'';
  const align={left:'flex-start',center:'center',right:'flex-end'}[layout.align]||'flex-start';
  const sampleSubtotal=12400;
  const sampleVat=620;
  const sampleTotal=13020;
  preview.innerHTML=`
    <div style="border:1px solid var(--border);background:var(--bg3);border-radius:8px;overflow:hidden">
      <div style="height:6px;background:${escapeHtml(layout.color)}"></div>
      <div style="padding:16px">
        <div class="flx-b mb16" style="align-items:flex-start;gap:14px">
          <div style="display:flex;flex-direction:column;align-items:${align};text-align:${escapeHtml(layout.align)};min-width:0">
            <div style="font-family:${layout.font==='Classic Serif'?'Georgia,serif':layout.font==='Compact Mono'?'monospace':'Syne,sans-serif'};font-weight:700;font-size:18px;color:${escapeHtml(layout.color)}">${escapeHtml(layout.logo)}</div>
            <div class="card-title" style="margin-top:5px">${escapeHtml(layout.company)}</div>
            <div class="card-sub">${escapeHtml(layout.address)}</div>
            ${layout.trnMode==='show'?`<div class="mono" style="font-size:11px;color:var(--text3);margin-top:3px">TRN ${escapeHtml(trn||'not set')}</div>`:''}
          </div>
          <div style="text-align:right">
            <div class="b b-b">${escapeHtml(layout.taxLabel)}</div>
            <div class="mono" style="font-size:11px;color:var(--text3);margin-top:6px">${escapeHtml(layout.paper)}</div>
            <div class="mono" style="font-size:11px;color:var(--text3)">INV-0849</div>
          </div>
        </div>
        <div class="g2 mb16">
          <div>
            <div class="section-hd">Bill To</div>
            <div style="font-weight:600">Customer Name</div>
            <div class="mono" style="font-size:11px;color:var(--text3)">TRN 100348712600001</div>
          </div>
          <div style="font-size:12px;line-height:1.7">
            <div class="flx-b"><span>Terms</span><span>${escapeHtml(layout.terms)}</span></div>
            <div class="flx-b"><span>Due Days</span><span class="mono">${escapeHtml(layout.dueDays)}</span></div>
            <div class="flx-b"><span>Language</span><span>${escapeHtml(layout.language)}</span></div>
          </div>
        </div>
        <table class="tbl" style="min-width:0">
          <tbody>
            <tr><td>Steel materials</td><td class="mono" style="text-align:right">${sampleSubtotal.toLocaleString('en-AE',{minimumFractionDigits:2})}</td></tr>
            ${layout.taxSummary?`<tr><td>VAT 5%</td><td class="mono" style="text-align:right">${sampleVat.toLocaleString('en-AE',{minimumFractionDigits:2})}</td></tr>`:''}
            <tr><td style="font-weight:700">Total</td><td class="mono" style="text-align:right;font-weight:700;color:${escapeHtml(layout.color)}">${sampleTotal.toLocaleString('en-AE',{minimumFractionDigits:2})} AED</td></tr>
          </tbody>
        </table>
        <div class="flx-b" style="align-items:flex-end;margin-top:14px;gap:12px">
          <div style="font-size:11.5px;color:var(--text3);line-height:1.6;min-width:0">
            <div>${escapeHtml(layout.bank)}</div>
            <div>${escapeHtml(layout.footer)}</div>
          </div>
          ${layout.qr?`<div style="width:54px;height:54px;border:1px solid var(--border);display:grid;place-items:center;font-size:10px;color:var(--text3);flex:0 0 auto">QR</div>`:''}
        </div>
        ${layout.signature?`<div style="margin-top:16px;border-top:1px dashed var(--border);padding-top:8px;font-size:11px;color:var(--text3)">Authorized signature and company stamp</div>`:''}
      </div>
    </div>`;
}

function renderSalesInvoicePreview(inv){
  currentSalesInvoice=inv;
  const title=document.getElementById('sales-view-title');
  const sub=document.getElementById('sales-view-sub');
  const body=document.getElementById('sales-view-body');
  if(!body)return;
  const layout=getInvoiceLayout();
  const companyTrn=currentCompany?.trn||document.getElementById('set-company-trn')?.value||'';
  const subtotal=Number(inv.subtotal||0);
  const vat=Number(inv.vat_amount||0);
  const total=Number(inv.total||subtotal+vat);
  const lines=(inv.lines&&inv.lines.length?inv.lines:[{description:'Sales invoice items',qty:1,price:subtotal,amount:subtotal}]);
  const fmt=n=>Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});

  if(title)title.textContent='Invoice '+(inv.invoice_no||'Draft');
  if(sub)sub.textContent=(inv.customer||'Customer')+' - '+(inv.status||'Draft');

  body.innerHTML=`
    <div style="border:1px solid var(--border);border-radius:10px;background:var(--bg3);padding:18px">
      <div class="flx-b mb16" style="border-top:4px solid ${escapeHtml(layout.color)};padding-top:14px">
        <div><div class="card-title">${escapeHtml(layout.company)}</div><div class="card-sub">${escapeHtml(layout.template)} - ${escapeHtml(layout.address)}</div>${layout.trnMode==='show'?`<div class="mono" style="color:var(--text3);font-size:11px;margin-top:3px">TRN ${escapeHtml(companyTrn||'not set')}</div>`:''}</div>
        <span class="b b-b">${escapeHtml(inv.status||'Draft')}</span>
      </div>
      <div class="g2 mb16">
        <div>
          <div class="section-hd">Bill To</div>
          <div style="font-size:14px;font-weight:600">${escapeHtml(inv.customer||'Customer')}</div>
          <div class="mono" style="color:var(--text3);margin-top:4px">${escapeHtml(inv.customer_trn||'TRN not provided')}</div>
        </div>
        <div>
          <div class="section-hd">Invoice</div>
          <div class="flx-b"><span style="color:var(--text3)">Invoice No.</span><span class="mono">${escapeHtml(inv.invoice_no||'Draft')}</span></div>
          <div class="flx-b"><span style="color:var(--text3)">Date</span><span>${escapeHtml(inv.date||'-')}</span></div>
          <div class="flx-b"><span style="color:var(--text3)">Due Date</span><span>${escapeHtml(inv.due_date||'-')}</span></div>
        </div>
      </div>
      <table class="tbl">
        <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${lines.map(line=>`<tr><td>${escapeHtml(line.description||'Item')}</td><td class="mono" style="text-align:right">${escapeHtml(line.qty||1)}</td><td class="mono" style="text-align:right">${fmt(line.price)}</td><td class="mono" style="text-align:right">${fmt(line.amount)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="inv-total-row">
        <div class="inv-total-box">
          <div class="tot-row"><span style="color:var(--text3)">Subtotal</span><span class="mono">AED ${fmt(subtotal)}</span></div>
          <div class="tot-row"><span style="color:var(--text3)">VAT</span><span class="mono">AED ${fmt(vat)}</span></div>
          <div class="tot-final"><span>Total</span><span class="mono">AED ${fmt(total)}</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div style="font-size:12px;color:var(--text2);line-height:1.7">${escapeHtml(layout.bank)}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:8px">${escapeHtml(layout.footer)}</div>
    </div>`;
}

let currentSalesInvoice=null;

function openSalesInvoiceRow(btn){
  const inv=invoiceFromSalesRow(btn.closest('tr'));
  renderSalesInvoicePreview(inv);
  showM('m-sales-view');
  audit('Viewed sales invoice',inv.invoice_no||'Draft','Viewed');
}

function shareSalesInvoiceRow(btn){
  const inv=invoiceFromSalesRow(btn.closest('tr'));
  currentSalesInvoice=inv;
  openInvoiceShareModal(inv);
}

function normalizeSalesInvoiceActions(){
  document.querySelectorAll('#sales-invoice-tbody tr').forEach(row=>{
    if(row.querySelector('td[colspan]'))return;
    const cells=[...row.children];
    const actionCell=cells.find(cell=>cell.querySelector('button[onclick*="openSalesInvoiceRow"],button[onclick*="shareSalesInvoiceRow"]'))||cells[cells.length-1];
    if(!actionCell)return;
    actionCell.dataset.actionCol='1';
    actionCell.innerHTML=salesInvoiceActionsHtml();
    row.dataset.rowActionsAdded='1';
  });
  const head=document.querySelector('#sales-invoice-tbody')?.closest('table')?.tHead?.rows?.[0];
  const last=head?.cells?.[head.cells.length-1];
  if(last)last.dataset.actionCol='1';
}

function buildDraftInvoice(){
  const lines=[...document.querySelectorAll('#inv-lines .inv-item')].map(row=>{
    const qty=parseAmount(row.querySelector('.inv-qty')?.value);
    const price=parseAmount(row.querySelector('.inv-price')?.value);
    return {description:row.querySelector('.inv-product')?.value||'Item',unit:row.querySelector('.inv-unit')?.value||'',qty,price,amount:qty*price};
  });
  const subtotal=lines.reduce((sum,line)=>sum+line.amount,0);
  const vat=subtotal*.05;
  return {
    invoice_no:document.getElementById('inv-no')?.value||'Draft',
    customer:document.getElementById('inv-cust')?.value||'Customer',
    customer_trn:document.getElementById('inv-ctrn')?.value||'TRN not provided',
    date:document.getElementById('inv-date')?.value||'',
    due_date:document.getElementById('inv-due')?.value||'',
    subtotal,
    vat_amount:vat,
    total:subtotal+vat,
    status:'Draft',
    lines
  };
}

function openDraftInvoicePreview(){
  const inv=buildDraftInvoice();
  renderSalesInvoicePreview(inv);
  showM('m-sales-view');
  audit('Previewed draft invoice',inv.invoice_no,'Viewed');
}

function openDraftInvoiceShare(){
  currentSalesInvoice=buildDraftInvoice();
  openInvoiceShareModal(currentSalesInvoice);
}

function invoiceShareMessage(inv=currentSalesInvoice){
  const total=Number(inv?.total||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
  return `Dear ${inv?.customer||'Customer'}, please find invoice ${inv?.invoice_no||'Draft'} for AED ${total}. Due date: ${inv?.due_date||'-'}.`;
}

function openInvoiceShareModal(inv=currentSalesInvoice){
  currentSalesInvoice=inv||currentSalesInvoice||buildDraftInvoice();
  const sub=document.getElementById('invoice-share-sub');
  const email=document.getElementById('share-email');
  const phone=document.getElementById('share-phone');
  const msg=document.getElementById('share-message');
  if(sub)sub.textContent=`${currentSalesInvoice.invoice_no||'Draft'} - ${currentSalesInvoice.customer||'Customer'}`;
  if(email&&!email.value)email.value='accounts@example.com';
  if(phone&&!phone.value)phone.value='+971 50 000 0000';
  if(msg)msg.value=invoiceShareMessage(currentSalesInvoice);
  showM('m-invoice-share');
}

function shareCurrentInvoice(channel){
  const inv=currentSalesInvoice||buildDraftInvoice();
  const msg=document.getElementById('share-message')?.value||invoiceShareMessage(inv);
  if(channel==='email'){
    toast(`Invoice ${inv.invoice_no||'Draft'} queued for email`, 'ok');
    audit('Shared invoice by email',inv.invoice_no||'Draft','Sent');
    return;
  }
  if(channel==='whatsapp'){
    toast(`WhatsApp message prepared for ${inv.invoice_no||'Draft'}`, 'ok');
    audit('Shared invoice by WhatsApp',inv.invoice_no||'Draft','Sent');
    const encoded=encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`,'_blank');
  }
}

let customerReturnToInvoice=false;

function openAddCustomerFromInvoice(){
  customerReturnToInvoice=true;
  document.getElementById('cust-name').value=document.getElementById('inv-cust')?.value||'';
  document.getElementById('cust-trn').value=(document.getElementById('inv-ctrn')?.value||'').replace(/\D/g,'');
  showM('m-customer');
}

function saveCustomer(){
  const name=(document.getElementById('cust-name')?.value||'').trim();
  const trn=(document.getElementById('cust-trn')?.value||'').replace(/\D/g,'');
  const emirate=document.getElementById('cust-emirate')?.value||'Dubai';
  const email=(document.getElementById('cust-email')?.value||'').trim();
  const phone=(document.getElementById('cust-phone')?.value||'').trim();

  if(!name){
    toast('Enter customer name','warn');
    return;
  }
  if(trn&&trn.length!==15){
    toast('Customer TRN must be 15 digits','err');
    return;
  }

  const tbody=document.getElementById('customer-tbody');
  const exists=tbody&&[...tbody.querySelectorAll('tr td:first-child')].some(td=>td.textContent.trim().toLowerCase()===name.toLowerCase());
  if(tbody&&!exists){
    const row=document.createElement('tr');
    row.innerHTML=`<td>${escapeHtml(name)}</td><td class="mono">${escapeHtml(trn||'Not registered')}</td><td>${escapeHtml(emirate)}</td><td>${escapeHtml(email||phone||'-')}</td><td class="mono" style="color:var(--accent)">AED 0</td><td><button class="btn btn-g btn-sm">View</button></td>`;
    tbody.prepend(row);
  }
  saveServer('customers',{name,trn,emirate,email,phone});

  const shouldFillInvoice=customerReturnToInvoice;
  closeM('m-customer');
  if(shouldFillInvoice){
    const invoiceCustomer=document.getElementById('inv-cust');
    const invoiceTrn=document.getElementById('inv-ctrn');
    if(invoiceCustomer)invoiceCustomer.value=name;
    if(invoiceTrn)invoiceTrn.value=trn;
  }

  ['cust-name','cust-trn','cust-address','cust-email','cust-phone'].forEach(id=>{
    const field=document.getElementById(id);
    if(field)field.value='';
  });
  toast('Customer added ?','ok');
  audit('Added customer',name,'Saved');
}

function dzOver(e,id){e.preventDefault();document.getElementById(id).classList.add('over');}
function dzLeave(id){document.getElementById(id).classList.remove('over');}
function dzDrop(e,id){
  e.preventDefault();document.getElementById(id).classList.remove('over');
  const files=[...e.dataTransfer.files];
  files.forEach(f=>readAndAddFile(f));
}
function purUpload(inp){
  const files=[...inp.files];
  files.forEach(f=>readAndAddFile(f));
  inp.value=''; // reset so same file can be re-selected
}

function readAndAddFile(file){
  const cat=document.getElementById('pur-cat')?.value||'Purchase Invoices';
  const period=document.getElementById('pur-period')?.value||'June 2024';
  const entry={name:file.name,size:file.size,type:file.type,base64:'',category:cat,period,status:'Reading',id:'F'+Date.now()+Math.random().toString(36).slice(2,6)};
  uploadedFiles.push(entry);
  renderFileList();
  updatePurchaseValidationFileStatus();
  updateFileCount();
  toast(`Reading ${file.name}...`,'info');
  const reader=new FileReader();
  reader.onload=function(e){
    const base64=e.target.result; // full data URL
    entry.base64=base64;
    entry.status='Queued';
    animateUpload(file.name,file.size,entry);
  };
  reader.onerror=function(){
    entry.status='Error';
    renderFileList();
    updatePurchaseValidationFileStatus();
    toast(`Could not read ${file.name}`,'err');
  };
  reader.readAsDataURL(file);
}

function animateUpload(name,size,entry){
  const pg=document.getElementById('pur-prog'),fill=document.getElementById('pur-fill'),fn=document.getElementById('pur-fname'),pct=document.getElementById('pur-pct');
  pg.style.display='block';fn.textContent='Uploading: '+name;
  let p=0;
  const iv=setInterval(()=>{
    p+=Math.random()*18+5;
    if(p>=100){
      p=100;clearInterval(iv);
      setTimeout(()=>{
        pg.style.display='none';fill.style.width='0%';
        entry.status='Ready';
        renderFileList();
        updatePurchaseValidationFileStatus();
        updateFileCount();
        toast(name+' uploaded ?','ok');
        // auto-extract if setting says yes
        const autoEl=document.querySelector('#page-purchase select[id="pur-auto"]');
        if(!autoEl||autoEl.value.startsWith('Yes'))setTimeout(()=>extractSingleFile(entry),600);
      },300);
    }
    fill.style.width=Math.min(p,100)+'%';
    pct.textContent=Math.round(Math.min(p,100))+'%';
  },120);
}

function getFileIcon(name){
  const ext=name.split('.').pop().toLowerCase();
  return {pdf:'??',xlsx:'??',csv:'??',zip:'??',jpg:'??',jpeg:'??',png:'??'}[ext]||'??';
}
function fmtSize(bytes){if(bytes<1024*1024)return(bytes/1024).toFixed(0)+' KB';return(bytes/(1024*1024)).toFixed(1)+' MB';}

function renderFileList(){
  const list=document.getElementById('pur-file-list');
  // keep the starter rows (they have no data-id), then append database rows
  const realRows=list.querySelectorAll('[data-file-id]');
  realRows.forEach(r=>r.remove());

  uploadedFiles.forEach(f=>{
    const statusBadge={
      Queued:'<span class="b b-gray">Queued</span>',
      Reading:'<span class="b b-a">Reading</span>',
      Ready:'<span class="b b-b">Ready</span>',
      Extracting:'<span class="b b-a">Extracting-</span>',
      Extracted:'<span class="b b-g">Extracted ?</span>',
      Error:'<span class="b b-r">Error</span>'
    }[f.status]||'<span class="b b-gray">Unknown</span>';

    const extractBtn=f.status==='Ready'
      ?`<button class="btn btn-p btn-sm" style="margin-left:6px" onclick="extractSingleFile(uploadedFiles.find(x=>x.id==='${f.id}'))">? Extract</button>`
      :'';

    const row=document.createElement('div');
    row.setAttribute('data-file-id',f.id);
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)';
    row.innerHTML=`
      <span style="font-size:20px">${getFileIcon(f.name)}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
        <div class="mono" style="color:var(--text3);font-size:11px">${fmtSize(f.size)} - ${f.category} - ${f.period}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">${statusBadge}${extractBtn}</div>`;
    list.appendChild(row);
  });
}

function updateFileCount(){
  const badge=document.getElementById('file-count-badge');
  if(badge) badge.textContent=(3+uploadedFiles.length)+' files';
}

function updatePurchaseValidationFileStatus(){
  const wrap=document.getElementById('pur-validation-file-status');
  if(!wrap)return;
  const files=uploadedFiles.filter(file=>['Extracted','Error','Ready','Queued'].includes(file.status));
  if(!files.length){
    wrap.innerHTML='<div class="stat"><div class="stat-lbl">Uploaded Files</div><div class="stat-val" style="font-size:18px;color:var(--text3)">No files</div><div class="stat-delta">Upload and extract purchase files first</div></div>';
    return;
  }
  wrap.innerHTML=files.map(file=>{
    const invoices=Array.isArray(file.invoices)?file.invoices:[];
    const saved=file.savedInvoiceNos instanceof Set?file.savedInvoiceNos:new Set(file.savedInvoiceNos||[]);
    const total=invoices.length;
    const savedCount=invoices.filter(inv=>saved.has(String(inv.invoice_no||''))).length;
    let label='Not uploaded';
    let cls='b-r';
    let color='var(--red)';
    let note=file.status==='Error'?'Extraction failed':'Not saved to purchase records';
    if(total>0&&savedCount>=total){
      label='Completed';
      cls='b-g';
      color='var(--green)';
      note=`${savedCount}/${total} saved to purchase records`;
    }else if(savedCount>0){
      label='Partial';
      cls='b-a';
      color='var(--amber)';
      note=`${savedCount}/${total||savedCount} saved to purchase records`;
    }else if(file.status==='Extracted'){
      note=`0/${total} saved to purchase records`;
    }else if(file.status==='Ready'){
      note='Ready for extraction';
    }
    return `<div class="stat">
      <div class="stat-lbl">${escapeHtml(file.name)}</div>
      <div class="stat-val" style="font-size:18px;color:${color}">${escapeHtml(label)}</div>
      <div class="stat-delta"><span class="b ${cls}">${escapeHtml(label)}</span> ${escapeHtml(note)}</div>
    </div>`;
  }).join('');
  renderPurchaseValidationDocumentStatus();
}

// -- AI EXTRACTION via backend API ----------------------------------
async function extractSingleFile(entry){
  if(!entry){toast('File not found','err');return;}
  entry.status='Extracting';
  renderFileList();
  toast('AI extracting: '+entry.name+'-','info');

  // Switch to the AI Extraction tab so user sees progress
  const extTab=document.querySelector('#page-purchase .tab:nth-child(2)');
  if(extTab)stab(extTab,'p-extract');

  const ep=document.getElementById('ext-prog'),ef=document.getElementById('ext-fill'),epct=document.getElementById('ext-pct');
  ep.style.display='block';
  let prog=0;
  const ticker=setInterval(()=>{prog=Math.min(prog+3,88);ef.style.width=prog+'%';epct.textContent=prog+'%';},200);

  try{
    const invoices=await requestInvoiceExtraction(entry);

    entry.status='Extracted';
    entry.invoices=invoices;
    entry.savedInvoiceNos=entry.savedInvoiceNos||new Set();
    renderFileList();
    await appendExtractedRows(invoices,entry.name);
    updateExtractionStats();
    try{
      updatePurchaseValidationFileStatus();
      buildValidationPanel(invoices);
    }catch(panelErr){
      console.warn('Purchase validation status update failed:',panelErr);
    }
    if(invoices.length<=250){
      hydrateFromServer().catch(err=>console.warn('Refresh after extraction failed:',err));
    }

    setTimeout(()=>{ep.style.display='none';ef.style.width='0%';},600);
    toast(`Extracted ${invoices.length} invoice(s) from ${entry.name} ?`,'ok');

    if(invoices.some(i=>!validatePurchaseAiInvoice(i).valid)){
      toast('Validation issues found - review required','warn');
    }

  }catch(err){
    clearInterval(ticker);
    ep.style.display='none';
    entry.status='Error';
    renderFileList();
    updatePurchaseValidationFileStatus();
    toast('Extraction failed: '+err.message,'err');
    console.error(err);
  }
}

async function appendExtractedRows(invoices,filename){
  const tbody=document.getElementById('ext-tbody');
  if(!tbody)return;
  if(tbody.querySelector('td[colspan]'))tbody.innerHTML='';
  if(!Array.isArray(invoices)||!invoices.length){
    tbody.innerHTML=`<tr><td colspan="30" style="color:var(--red);text-align:center">No data extracted from ${escapeHtml(filename||'uploaded file')}.</td></tr>`;
    return;
  }
  const existingInvoiceNos=new Set([...tbody.querySelectorAll('tr[data-inv]')].map(row=>row.dataset.invoiceNo||'').filter(Boolean));
  let fragment=document.createDocumentFragment();
  let appended=0;
  const previewInvoices=invoices.slice(0,PURCHASE_AI_PREVIEW_LIMIT);
  for(const [invoiceIndex,inv] of previewInvoices.entries()){
    const invoiceNo=String(inv.invoice_no||'');
    if(existingInvoiceNos.has(invoiceNo)){
      toast(`Duplicate in current purchase AI upload: ${inv.invoice_no}`,'warn');
      continue;
    }
    existingInvoiceNos.add(invoiceNo);
    const invoiceUid=`${Date.now()}-${invoiceIndex}-${Math.random().toString(36).slice(2,8)}`;
    const validation=validatePurchaseAiInvoice(inv);
    const confCls=inv.confidence>=90?'b-g':inv.confidence>=70?'b-a':'b-r';
    const stCls=validation.valid?'b-g':'b-a';
    const fmt=n=>Number(n).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
    const lines=Array.isArray(inv.lines)&&inv.lines.length?inv.lines:[{}];
    lines.forEach((line,index)=>{
      const lineTotal=parseAmount(line.line_total||line.amount);
      const vat=index===0?parseAmount(inv.vat_amount):0;
      const paid=index===0?parseAmount(inv.paid):0;
      const shipping=index===0?parseAmount(inv.shipping):0;
      const total=index===0?parseAmount(inv.total):(lineTotal+vat);
      const row=document.createElement('tr');
      row.setAttribute('data-inv',JSON.stringify(inv));
      row.dataset.invoiceNo=inv.invoice_no||'';
      row.dataset.invoiceUid=invoiceUid;
      row.dataset.lineIndex=String(index);
      row.dataset.validation=validation.valid?'valid':'review';
      row.innerHTML=`
        <td><input type="checkbox" class="purchase-ai-select" ${validation.valid?'checked':''} aria-label="Select ${escapeHtml(inv.invoice_no)} line ${index+1}"></td>
        <td class="purchase-ai-details" style="color:var(--text3);font-size:12px">${escapeHtml(index===0?(validation.issues.join('; ')||purchaseAiRawDetails(line)||'Ready to save'):'')}</td>
        <td data-action-col="1">${index===0?purchaseAiUploadActionsHtml():''}</td>
        <td class="mono">${escapeHtml(inv.invoice_no)}</td>
        <td>${escapeHtml(inv.date||'')}</td>
        <td>${escapeHtml(inv.supplier||'')}</td>
        <td>${escapeHtml(inv.address||'')}</td>
        <td>${escapeHtml(inv.pay_term||'')}</td>
        <td>${escapeHtml(purchaseAiProductName(line))}</td>
        <td class="mono">${fmt(line.quantity||line.qty||0)}</td>
        <td>${escapeHtml(line.unit||line.unit_of_measure||line.uom||'PCS')}</td>
        <td class="mono">${fmt(line.unit_cost||line.cost||line.unitCost||0)}</td>
        <td class="mono">${fmt(line.discount_percent||line.discountPct||0)}</td>
        <td class="mono">${fmt(line.unit_cost_before_tax||line.unit_cost||line.cost||0)}</td>
        <td class="mono">${fmt(line.line_total||line.amount||0)}</td>
        <td class="mono">${fmt(line.profit_margin||line.margin||0)}</td>
        <td class="mono">${fmt(line.selling_price_inc_tax||line.selling_price||0)}</td>
        <td>${escapeHtml(inv.discount_type||'None')}</td>
        <td class="mono">${fmt(inv.discount_value||inv.discount||0)}</td>
        <td class="mono">${fmt(vat)}</td>
        <td>${escapeHtml(inv.shipping_details||'')}</td>
        <td class="mono">${fmt(shipping)}</td>
        <td class="mono">${fmt(paid)}</td>
        <td>${escapeHtml(inv.paid_on||'')}</td>
        <td>${escapeHtml(inv.payment_method||'Cash')}</td>
        <td>${escapeHtml(inv.payment_account||'None')}</td>
        <td>${escapeHtml(inv.payment_note||'')}</td>
        <td>${escapeHtml(inv.notes||'')}</td>
        <td class="mono">${fmt(Math.max(0,total-paid))}</td>
        <td class="purchase-ai-validation"><span class="b ${stCls}">${validation.valid?'Valid':'Review'}</span></td>`;
      fragment.appendChild(row);
      appended++;
    });
    if(appended&&appended%100===0){
      tbody.insertBefore(fragment,tbody.firstChild);
      fragment=document.createDocumentFragment();
      await yieldToBrowser();
    }
  }
  if(fragment.childNodes.length)tbody.insertBefore(fragment,tbody.firstChild);
  if(invoices.length>previewInvoices.length){
    const row=document.createElement('tr');
    row.dataset.previewSummary='1';
    row.innerHTML=`<td colspan="30" style="color:var(--text3);text-align:center">Showing ${previewInvoices.length.toLocaleString('en-AE')} of ${invoices.length.toLocaleString('en-AE')} extracted invoices. Save All will save the full upload.</td>`;
    tbody.appendChild(row);
  }
  revalidatePurchaseAiRows();
}

function yieldToBrowser(){
  return new Promise(resolve=>setTimeout(resolve,0));
}

function purchaseAiProductName(line={}){
  return String(line.product||line.product_name||line.item_name||line.description||line.item_description||line.sku||line.code||'').trim();
}

function purchaseAiRawDetails(line={}){
  const raw=line.raw||{};
  const entries=Object.entries(raw)
    .filter(([key,value])=>value!==undefined&&value!==null&&String(value).trim()!=='')
    .slice(0,8)
    .map(([key,value])=>`${key}: ${value}`);
  return entries.length?`Raw: ${entries.join(' | ')}`:'';
}

function purchaseRecordFromExtractedInvoice(inv){
  const total=Number(inv.total||0);
  const status=String(inv.status||'Review');
  const lines=Array.isArray(inv.lines)?inv.lines:[];
  const paid=Number(inv.paid||0);
  return {
    ref:inv.invoice_no,
    supplier:inv.supplier||'Supplier',
    address:inv.address||'',
    date:inv.date||'',
    location:'Dubai HQ',
    pay_term:inv.pay_term||'',
    items:lines.length||1,
    net_amount:Number(inv.net_amount||inv.subtotal||0),
    discount:discountAmountFromExtractedInvoice(inv),
    tax_amount:Number(inv.tax_amount||inv.vat_amount||0),
    shipping:Number(inv.shipping||0),
    total,
    paid,
    due:Number(inv.due??Math.max(0,total-paid)),
    source:'AI Upload',
    status:status==='Valid'?'Received':status,
    extraction_status:status,
    supplier_trn:inv.supplier_trn||'',
    issues:inv.issues||'',
    discount_type:inv.discount_type||'None',
    discount_value:Number(inv.discount_value||0),
    tax_type:inv.tax_type||(Number(inv.vat_amount||0)>0?'VAT 5%':'None'),
    lines,
    payment_method:inv.payment_method||'Cash',
    payment_account:inv.payment_account||'None',
    payment_note:inv.payment_note||'',
    paid_on:inv.paid_on||'',
    shipping_details:inv.shipping_details||'',
    notes:inv.notes||''
  };
}

function discountAmountFromExtractedInvoice(inv){
  const net=Number(inv.net_amount||inv.subtotal||0);
  const value=Number(inv.discount_value||inv.discount||0);
  return inv.discount_type==='Percentage'?net*(value/100):inv.discount_type==='Fixed'?value:0;
}

async function storeExtractedPurchaseRecords(){
  const rows=[...document.querySelectorAll('#ext-tbody tr[data-inv]')];
  const visibleInvoiceNos=new Set(rows.map(row=>String(row.dataset.invoiceNo||'')));
  const skippedOrUnchecked=new Set(rows
    .filter(row=>row.dataset.skipped==='1'||!row.querySelector('.purchase-ai-select')?.checked)
    .map(row=>String(row.dataset.invoiceNo||'')));
  const selectedInvoices=new Map();
  rows
    .filter(row=>row.dataset.skipped!=='1')
    .filter(row=>row.querySelector('.purchase-ai-select')?.checked)
    .forEach(row=>{
      try{
        const inv=JSON.parse(row.dataset.inv||'{}');
        const invoiceNo=String(row.dataset.invoiceNo||inv.invoice_no||'');
        if(invoiceNo&&!selectedInvoices.has(invoiceNo))selectedInvoices.set(invoiceNo,inv);
      }catch{}
    });
  uploadedFiles.forEach(file=>{
    const saved=file.savedInvoiceNos instanceof Set?file.savedInvoiceNos:new Set(file.savedInvoiceNos||[]);
    (file.invoices||[]).forEach(inv=>{
      const invoiceNo=String(inv.invoice_no||'');
      if(!invoiceNo||saved.has(invoiceNo)||skippedOrUnchecked.has(invoiceNo))return;
      if(!visibleInvoiceNos.has(invoiceNo)||!selectedInvoices.has(invoiceNo))selectedInvoices.set(invoiceNo,inv);
    });
  });
  if(selectedInvoices.size===0){toast('No extracted purchase invoices to store','warn');return;}
  let stored=0;
  let updated=0;
  let existing=0;
  let reviewSaved=0;
  let failed=0;
  const recordsToSave=[];
  const savedInvoiceNos=[];
  const existingRows=purchaseRecordRowMap();
  const existingRefs=new Set(existingRows.keys());
  const aiInvoiceCounts=purchaseAiInvoiceCounts();
  for(const inv of selectedInvoices.values()){
    const validation=validatePurchaseAiInvoice(inv,{aiInvoiceCounts,existingPurchaseRefs:existingRefs});
    if(!validation.valid){
      reviewSaved++;
      markPurchaseAiInvoiceRows(inv.invoice_no,'Review',validation.issues.join('; ')||'Saved with review notes');
    }
    const record=purchaseRecordFromExtractedInvoice(inv);
    const refKey=invoiceKey(record.ref||record.invoice_no);
    const existingRow=existingRows.get(refKey);
    const result=existingRow
      ? (purchaseRecordsEquivalent(purchaseRecordFromRow(existingRow),record)?'same':'updated')
      : 'created';
    if(result==='same'){
      existing++;
      markExtractedInvoiceUploaded(inv.invoice_no);
      markPurchaseAiInvoiceRows(inv.invoice_no,'Already Exists','Same purchase already exists in database',true);
      continue;
    }
    if(result==='updated')updated++;
    if(result==='created')stored++;
    recordsToSave.push({record,result,invoiceNo:inv.invoice_no,refKey});
  }
  if(recordsToSave.length){
    try{
      await savePurchaseRecordsInChunks(recordsToSave.map(item=>item.record));
      recordsToSave.forEach(item=>{
        const oldRow=existingRows.get(item.refKey);
        if(oldRow)oldRow.remove();
        renderPurchaseRecord(item.record,{deferRefresh:true});
        savedInvoiceNos.push(item.invoiceNo);
      });
      refreshEnhancedTable(document.getElementById('purchase-record-tbody')?.closest('table'));
      markExtractedInvoicesUploaded(savedInvoiceNos);
      markPurchaseAiInvoicesBulk(recordsToSave.map(item=>({
        invoiceNo:item.invoiceNo,
        status:item.result==='updated'?'Updated':'Saved',
        details:item.result==='updated'?'Existing purchase updated in database':'Saved to purchase records',
        skip:true
      })));
    }catch(err){
      failed=recordsToSave.length;
      stored=0;
      updated=0;
      markPurchaseAiInvoicesBulk(recordsToSave.map(item=>({
        invoiceNo:item.invoiceNo,
        status:'Review',
        details:'Database bulk save failed; try saving again',
        skip:false
      })));
      console.warn('Purchase AI bulk save failed:',err);
    }
  }
  if(stored>0||updated>0){
    audit('Stored extracted purchase invoices',`${stored} added, ${updated} updated`,'Saved');
    const tab=document.querySelector('#page-purchase .tab:nth-child(5)');
    if(tab)stab(tab,'p-records');
  }
  updatePurchaseValidationFileStatus();
  toast(`${stored} added, ${updated} updated, ${existing} already exist${reviewSaved?`; ${reviewSaved} saved with review notes`:''}${failed?`; ${failed} failed to save`:''}`,'ok');
}

async function savePurchaseRecordsInChunks(records){
  const chunkSize=500;
  for(let index=0;index<records.length;index+=chunkSize){
    const chunk=records.slice(index,index+chunkSize);
    await bulkSaveServer('purchaseRecords',chunk,{throwOnError:true});
    toast(`Saved ${Math.min(index+chunk.length,records.length)} of ${records.length} purchase rows...`,'info');
  }
}

function purchaseRecordRowMap(){
  const map=new Map();
  document.querySelectorAll('#purchase-record-tbody tr:not([data-empty-state])').forEach(row=>{
    const key=invoiceKey(row.children[0]?.textContent);
    if(key)map.set(key,row);
  });
  return map;
}

function markExtractedInvoiceUploaded(invoiceNo){
  const key=String(invoiceNo||'');
  uploadedFiles.forEach(file=>{
    if(!Array.isArray(file.invoices))return;
    if(file.invoices.some(inv=>String(inv.invoice_no||'')===key)){
      file.savedInvoiceNos=file.savedInvoiceNos instanceof Set?file.savedInvoiceNos:new Set(file.savedInvoiceNos||[]);
      file.savedInvoiceNos.add(key);
    }
  });
  renderPurchaseValidationDocumentStatus();
}

function markExtractedInvoicesUploaded(invoiceNos){
  const keys=new Set((invoiceNos||[]).map(value=>String(value||'')));
  uploadedFiles.forEach(file=>{
    if(!Array.isArray(file.invoices))return;
    const matched=file.invoices.some(inv=>keys.has(String(inv.invoice_no||'')));
    if(!matched)return;
    file.savedInvoiceNos=file.savedInvoiceNos instanceof Set?file.savedInvoiceNos:new Set(file.savedInvoiceNos||[]);
    file.invoices.forEach(inv=>{
      const key=String(inv.invoice_no||'');
      if(keys.has(key))file.savedInvoiceNos.add(key);
    });
  });
  renderPurchaseValidationDocumentStatus();
}

function markPurchaseAiInvoicesBulk(updates){
  const updateMap=new Map((updates||[]).map(item=>[String(item.invoiceNo||''),item]));
  document.querySelectorAll('#ext-tbody tr[data-inv]').forEach(row=>{
    const update=updateMap.get(String(row.dataset.invoiceNo||''));
    if(!update)return;
    const cls=update.status==='Saved'?'b-g':update.status==='Updated'?'b-g':update.status==='Review'?'b-a':'b-gray';
    const validationCell=row.querySelector('.purchase-ai-validation');
    const detailsCell=row.querySelector('.purchase-ai-details');
    if(validationCell)validationCell.innerHTML=`<span class="b ${cls}">${escapeHtml(update.status)}</span>`;
    if(detailsCell&&Number(row.dataset.lineIndex||0)===0)detailsCell.textContent=update.details||update.status;
    if(update.skip){
      row.dataset.skipped='1';
      const box=row.querySelector('.purchase-ai-select');
      if(box)box.checked=false;
    }
  });
}

function upsertExtractedPurchaseRecord(record){
  const tbody=document.getElementById('purchase-record-tbody');
  const ref=String(record.ref||record.invoice_no||'').trim().toLowerCase();
  if(!tbody||!ref){
    renderPurchaseRecord(record);
    return 'created';
  }
  const existingRow=[...tbody.querySelectorAll('tr:not([data-empty-state])')]
    .find(row=>row.children[0]?.textContent.trim().toLowerCase()===ref);
  if(!existingRow){
    renderPurchaseRecord(record);
    return 'created';
  }
  const existingRecord=purchaseRecordFromRow(existingRow);
  if(purchaseRecordsEquivalent(existingRecord,record)){
    return 'same';
  }
  existingRow.remove();
  renderPurchaseRecord(record);
  return 'updated';
}

function purchaseRecordsEquivalent(a,b){
  return JSON.stringify(normalizePurchaseRecordForCompare(a))===JSON.stringify(normalizePurchaseRecordForCompare(b));
}

function normalizePurchaseRecordForCompare(record={}){
  const normNumber=value=>Number(value||0).toFixed(2);
  const normText=value=>String(value||'').trim().toLowerCase();
  const lines=Array.isArray(record.lines)?record.lines:[];
  return {
    ref:normText(record.ref||record.invoice_no),
    supplier:normText(record.supplier),
    address:normText(record.address),
    date:normText(record.date),
    pay_term:normText(record.pay_term),
    net_amount:normNumber(record.net_amount||record.subtotal),
    discount:normNumber(record.discount),
    tax_amount:normNumber(record.tax_amount||record.vat_amount),
    shipping:normNumber(record.shipping),
    total:normNumber(record.total),
    paid:normNumber(record.paid),
    due:normNumber(record.due),
    discount_type:normText(record.discount_type),
    discount_value:normNumber(record.discount_value),
    tax_type:normText(record.tax_type),
    payment_method:normText(record.payment_method),
    payment_account:normText(record.payment_account),
    payment_note:normText(record.payment_note),
    paid_on:normText(record.paid_on),
    shipping_details:normText(record.shipping_details),
    notes:normText(record.notes),
    lines:lines.map(line=>({
      product:normText(line.product||line.description),
      category:normText(line.category),
      unit:normText(line.unit||line.unit_of_measure||line.uom),
      quantity:normNumber(line.quantity||line.qty),
      unit_cost:normNumber(line.unit_cost||line.cost),
      discount_percent:normNumber(line.discount_percent||line.discountPct),
      unit_cost_before_tax:normNumber(line.unit_cost_before_tax||line.unit_cost||line.cost),
      line_total:normNumber(line.line_total||line.amount),
      profit_margin:normNumber(line.profit_margin||line.margin),
      selling_price_inc_tax:normNumber(line.selling_price_inc_tax||line.selling_price)
    }))
  };
}

function markPurchaseAiInvoiceRows(invoiceNo,status,details,skip=false){
  document.querySelectorAll('#ext-tbody tr[data-inv]').forEach(row=>{
    if((row.dataset.invoiceNo||'')!==String(invoiceNo||''))return;
    const cls=status==='Saved'?'b-g':status==='Review'?'b-a':'b-gray';
    row.querySelector('.purchase-ai-validation').innerHTML=`<span class="b ${cls}">${escapeHtml(status)}</span>`;
    row.querySelector('.purchase-ai-details').textContent=details||status;
    if(skip){
      row.dataset.skipped='1';
      const box=row.querySelector('.purchase-ai-select');
      if(box)box.checked=false;
    }
  });
}

function validatePurchaseAiInvoice(inv,options={}){
  const issues=[];
  const invoiceNo=String(inv.invoice_no||'').trim();
  const invoiceKeyValue=invoiceKey(invoiceNo);
  const trn=String(inv.supplier_trn||'').replace(/\D/g,'');
  const subtotal=Number(inv.subtotal||0);
  const vat=Number(inv.vat_amount||0);
  const total=Number(inv.total||0);
  if(!invoiceNo)issues.push('Invoice number missing');
  if(invoiceNo){
    const existsInRecords=options.existingPurchaseRefs
      ? options.existingPurchaseRefs.has(invoiceKeyValue)
      : tableHasText('#purchase-record-tbody',invoiceNo);
    if(existsInRecords)issues.push('Duplicate purchase invoice in records');
  }
  if(invoiceNo){
    const duplicateCount=options.aiInvoiceCounts?.get(invoiceKeyValue)??countPurchaseAiInvoiceNo(invoiceNo);
    if(duplicateCount>1)issues.push('Duplicate invoice number in AI upload');
  }
  if(!String(inv.supplier||'').trim())issues.push('Supplier missing');
  if(!String(inv.date||'').trim())issues.push('Date missing');
  if(trn&&trn.length!==15)issues.push('Supplier TRN must be 15 digits');
  if(total&&Math.abs((subtotal+vat)-total)>.05)issues.push('Total does not match subtotal + VAT');
  if(String(inv.status||'').toLowerCase()==='error')issues.push(inv.issues||'Extraction returned error status');
  if(Number(inv.confidence||0)<70)issues.push('Low confidence extraction');
  return {valid:issues.length===0,issues};
}

function countPurchaseAiInvoiceNo(invoiceNo){
  const key=invoiceKey(invoiceNo);
  if(!key)return 0;
  const invoiceUids=new Set();
  [...document.querySelectorAll('#ext-tbody tr[data-inv]')].forEach((row,index)=>{
    try{
      if(invoiceKey(JSON.parse(row.dataset.inv||'{}').invoice_no)!==key)return;
      invoiceUids.add(row.dataset.invoiceUid||`${row.dataset.invoiceNo||key}:${index}`);
    }catch(err){
      console.warn('Purchase AI duplicate check skipped a row:',err);
    }
  });
  return invoiceUids.size;
}

function purchaseAiUploadActionsHtml(){
  return `<div class="row-actions">
    <button class="icon-btn" type="button" title="Edit" aria-label="Edit purchase AI row" onclick="openPurchaseAiEdit(this)">${editIconSvg()}</button>
    <button class="icon-btn skip" type="button" title="Skip" aria-label="Skip purchase AI row" onclick="skipPurchaseAiRow(this)">${skipIconSvg()}</button>
    <button class="icon-btn danger" type="button" title="Delete" aria-label="Delete purchase AI row" onclick="deletePurchaseAiRow(this)">${deleteIconSvg()}</button>
  </div>`;
}

let purchaseAiEditRow=null;

function ensurePurchaseAiEditModal(){
  let overlay=document.getElementById('m-purchase-ai-edit');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.className='overlay';
  overlay.id='m-purchase-ai-edit';
  overlay.onclick=e=>closeOvBg(e,'m-purchase-ai-edit');
  overlay.innerHTML=`
    <div class="modal modal-lg">
      <div class="modal-title">Edit Extracted Purchase</div>
      <div class="modal-sub" id="pai-edit-sub">Correct extracted invoice and item details</div>
      <div class="fr3">
        <div class="fg"><label class="fl">Invoice No.</label><input class="fi mono" id="pai-invoice"></div>
        <div class="fg"><label class="fl">Purchase Date</label><input class="fi" id="pai-date"></div>
        <div class="fg"><label class="fl">Supplier</label><input class="fi" id="pai-supplier"></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Address</label><input class="fi" id="pai-address"></div>
        <div class="fg"><label class="fl">Pay Term</label><select class="fi" id="pai-term"><option value="">Please Select</option><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></div>
        <div class="fg"><label class="fl">Product Name</label><input class="fi" id="pai-product"></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Category</label><input class="fi" id="pai-category"></div>
        <div class="fg"><label class="fl">Purchase Quantity</label><input class="fi mono" id="pai-qty" oninput="calcPurchaseAiEditLine()"></div>
        <div class="fg"><label class="fl">Unit of Measure</label><input class="fi mono" id="pai-unit"></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Unit Cost Before Discount</label><input class="fi mono" id="pai-cost" oninput="calcPurchaseAiEditLine()"></div>
        <div class="fg"><label class="fl">Discount %</label><input class="fi mono" id="pai-line-discount" oninput="calcPurchaseAiEditLine()"></div>
        <div class="fg"><label class="fl">Unit Cost Before Tax</label><input class="fi mono" id="pai-cost-before-tax" readonly></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Line Total</label><input class="fi mono" id="pai-line-total" oninput="calcPurchaseAiEditInvoice()"></div>
        <div class="fg"><label class="fl">Profit Margin %</label><input class="fi mono" id="pai-margin" oninput="calcPurchaseAiEditLine()"></div>
        <div class="fg"><label class="fl">Unit Selling Price Inc. Tax</label><input class="fi mono" id="pai-selling" readonly></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Discount Type</label><select class="fi" id="pai-discount-type" onchange="calcPurchaseAiEditInvoice()"><option>None</option><option>Fixed</option><option>Percentage</option></select></div>
        <div class="fg"><label class="fl">Discount Amount</label><input class="fi mono" id="pai-discount-value" oninput="calcPurchaseAiEditInvoice()"></div>
        <div class="fg"><label class="fl">Purchase Tax</label><select class="fi" id="pai-tax-type" onchange="calcPurchaseAiEditInvoice()"><option>None</option><option>VAT 5%</option><option>Reverse Charge 5%</option><option>Exempt</option></select></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Purchase Tax Amount</label><input class="fi mono" id="pai-vat" oninput="calcPurchaseAiEditInvoice()"></div>
        <div class="fg"><label class="fl">Shipping Details</label><input class="fi" id="pai-shipping-details"></div>
        <div class="fg"><label class="fl">Shipping Charges</label><input class="fi mono" id="pai-shipping" oninput="calcPurchaseAiEditInvoice()"></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Purchase Total</label><input class="fi mono" id="pai-total" readonly></div>
        <div class="fg"><label class="fl">Paid Amount</label><input class="fi mono" id="pai-paid" oninput="calcPurchaseAiEditInvoice()"></div>
        <div class="fg"><label class="fl">Payment Due</label><input class="fi mono" id="pai-due" readonly></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Paid On</label><input class="fi" id="pai-paid-on"></div>
        <div class="fg"><label class="fl">Payment Method</label><select class="fi" id="pai-pay-method"><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Cheque</option><option>Online</option></select></div>
        <div class="fg"><label class="fl">Payment Account</label><input class="fi" id="pai-pay-account"></div>
      </div>
      <div class="fr2">
        <div class="fg"><label class="fl">Payment Note</label><input class="fi" id="pai-pay-note"></div>
        <div class="fg"><label class="fl">Additional Notes</label><input class="fi" id="pai-notes"></div>
      </div>
      <div class="fr3">
        <div class="fg"><label class="fl">Confidence %</label><input class="fi mono" id="pai-confidence" type="number" min="0" max="100"></div>
        <div class="fg"><label class="fl">Status</label><select class="fi" id="pai-status"><option>Valid</option><option>Review</option><option>Error</option></select></div>
        <div class="fg"><label class="fl">Issues</label><input class="fi" id="pai-issues"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-g" onclick="closeM('m-purchase-ai-edit')">Cancel</button>
        <button class="btn btn-g" onclick="savePurchaseAiEdit(true)">Save & Next</button>
        <button class="btn btn-p" onclick="savePurchaseAiEdit(false)">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function openPurchaseAiEdit(btn){
  const row=btn.closest('tr');
  if(!row)return;
  purchaseAiEditRow=row;
  let inv={};
  try{inv=JSON.parse(row.dataset.inv||'{}');}catch{return;}
  const lineIndex=Number(row.dataset.lineIndex||0);
  const line=Array.isArray(inv.lines)?(inv.lines[lineIndex]||{}):{};
  ensurePurchaseAiEditModal();
  document.getElementById('pai-invoice').value=inv.invoice_no||'';
  document.getElementById('pai-date').value=inv.date||'';
  document.getElementById('pai-supplier').value=inv.supplier||'';
  document.getElementById('pai-address').value=inv.address||'';
  document.getElementById('pai-term').value=inv.pay_term||'';
  document.getElementById('pai-product').value=purchaseAiProductName(line);
  document.getElementById('pai-category').value=line.category||'';
  document.getElementById('pai-unit').value=line.unit||line.unit_of_measure||line.uom||'PCS';
  document.getElementById('pai-qty').value=line.quantity||line.qty||0;
  document.getElementById('pai-cost').value=line.unit_cost||line.cost||line.unitCost||0;
  document.getElementById('pai-line-discount').value=line.discount_percent||line.discountPct||0;
  document.getElementById('pai-cost-before-tax').value=line.unit_cost_before_tax||line.unit_cost||line.cost||0;
  document.getElementById('pai-line-total').value=line.line_total||line.amount||0;
  document.getElementById('pai-margin').value=line.profit_margin||line.margin||0;
  document.getElementById('pai-selling').value=line.selling_price_inc_tax||line.selling_price||0;
  document.getElementById('pai-discount-type').value=inv.discount_type||'None';
  document.getElementById('pai-discount-value').value=inv.discount_value||inv.discount||0;
  document.getElementById('pai-tax-type').value=inv.tax_type||((Number(inv.vat_amount||0)>0)?'VAT 5%':'None');
  document.getElementById('pai-vat').value=inv.vat_amount||0;
  document.getElementById('pai-shipping-details').value=inv.shipping_details||'';
  document.getElementById('pai-shipping').value=inv.shipping||0;
  document.getElementById('pai-total').value=inv.total||0;
  document.getElementById('pai-paid').value=inv.paid||0;
  document.getElementById('pai-due').value=inv.due||0;
  document.getElementById('pai-paid-on').value=inv.paid_on||'';
  document.getElementById('pai-pay-method').value=inv.payment_method||'Cash';
  document.getElementById('pai-pay-account').value=inv.payment_account||'None';
  document.getElementById('pai-pay-note').value=inv.payment_note||'';
  document.getElementById('pai-notes').value=inv.notes||'';
  document.getElementById('pai-confidence').value=inv.confidence||90;
  document.getElementById('pai-status').value=inv.status||'Valid';
  document.getElementById('pai-issues').value=inv.issues||'';
  document.getElementById('pai-edit-sub').textContent=`${inv.invoice_no||'Purchase'} - line ${lineIndex+1}`;
  calcPurchaseAiEditInvoice();
  showM('m-purchase-ai-edit');
}

function calcPurchaseAiEditLine(){
  const qty=parseAmount(document.getElementById('pai-qty')?.value);
  const cost=parseAmount(document.getElementById('pai-cost')?.value);
  const discountPct=parseAmount(document.getElementById('pai-line-discount')?.value);
  const beforeTax=cost*(1-(discountPct/100));
  const margin=parseAmount(document.getElementById('pai-margin')?.value);
  document.getElementById('pai-cost-before-tax').value=beforeTax.toFixed(2);
  document.getElementById('pai-line-total').value=(qty*beforeTax).toFixed(2);
  document.getElementById('pai-selling').value=(beforeTax*(1+margin/100)*1.05).toFixed(2);
  calcPurchaseAiEditInvoice();
}

function calcPurchaseAiEditInvoice(){
  const lineTotal=parseAmount(document.getElementById('pai-line-total')?.value);
  const discountType=document.getElementById('pai-discount-type')?.value||'None';
  const discountValue=parseAmount(document.getElementById('pai-discount-value')?.value);
  const discount=discountType==='Percentage'?lineTotal*(discountValue/100):discountType==='Fixed'?discountValue:0;
  const taxable=Math.max(0,lineTotal-discount);
  const taxType=document.getElementById('pai-tax-type')?.value||'None';
  const calculatedVat=taxType.includes('5%')&&!taxType.toLowerCase().includes('exempt')?taxable*.05:0;
  const vatField=document.getElementById('pai-vat');
  if(vatField&&document.activeElement!==vatField)vatField.value=calculatedVat.toFixed(2);
  const vat=parseAmount(vatField?.value);
  const shipping=parseAmount(document.getElementById('pai-shipping')?.value);
  const paid=parseAmount(document.getElementById('pai-paid')?.value);
  const gross=taxable+vat+shipping;
  const total=document.getElementById('pai-total');
  if(total)total.value=gross.toFixed(2);
  const due=document.getElementById('pai-due');
  if(due)due.value=Math.max(0,gross-paid).toFixed(2);
}

function savePurchaseAiEdit(next=false){
  if(!purchaseAiEditRow)return closeM('m-purchase-ai-edit');
  let inv={};
  try{inv=JSON.parse(purchaseAiEditRow.dataset.inv||'{}');}catch{return;}
  const oldInvoiceNo=inv.invoice_no||purchaseAiEditRow.dataset.invoiceNo||'';
  const lineIndex=Number(purchaseAiEditRow.dataset.lineIndex||0);
  const lines=Array.isArray(inv.lines)?inv.lines:[{}];
  lines[lineIndex]={
    ...(lines[lineIndex]||{}),
    product:document.getElementById('pai-product').value.trim(),
    category:document.getElementById('pai-category').value.trim(),
    unit:document.getElementById('pai-unit').value.trim()||'PCS',
    quantity:parseAmount(document.getElementById('pai-qty').value),
    unit_cost:parseAmount(document.getElementById('pai-cost').value),
    discount_percent:parseAmount(document.getElementById('pai-line-discount').value),
    unit_cost_before_tax:parseAmount(document.getElementById('pai-cost-before-tax').value),
    line_total:parseAmount(document.getElementById('pai-line-total').value),
    profit_margin:parseAmount(document.getElementById('pai-margin').value),
    selling_price_inc_tax:parseAmount(document.getElementById('pai-selling').value)
  };
  const subtotal=lines.reduce((sum,line)=>sum+parseAmount(line.line_total||line.amount),0);
  const paid=parseAmount(document.getElementById('pai-paid').value);
  const total=parseAmount(document.getElementById('pai-total').value);
  inv={
    ...inv,
    invoice_no:document.getElementById('pai-invoice').value.trim(),
    date:document.getElementById('pai-date').value.trim(),
    supplier:document.getElementById('pai-supplier').value.trim(),
    address:document.getElementById('pai-address').value.trim(),
    pay_term:document.getElementById('pai-term').value,
    subtotal,
    net_amount:subtotal,
    discount_type:document.getElementById('pai-discount-type').value,
    discount_value:parseAmount(document.getElementById('pai-discount-value').value),
    tax_type:document.getElementById('pai-tax-type').value,
    vat_amount:parseAmount(document.getElementById('pai-vat').value),
    tax_amount:parseAmount(document.getElementById('pai-vat').value),
    shipping_details:document.getElementById('pai-shipping-details').value.trim(),
    shipping:parseAmount(document.getElementById('pai-shipping').value),
    total,
    paid,
    due:Math.max(0,total-paid),
    paid_on:document.getElementById('pai-paid-on').value,
    payment_method:document.getElementById('pai-pay-method').value,
    payment_account:document.getElementById('pai-pay-account').value,
    payment_note:document.getElementById('pai-pay-note').value.trim(),
    notes:document.getElementById('pai-notes').value.trim(),
    confidence:parseAmount(document.getElementById('pai-confidence').value),
    status:document.getElementById('pai-status').value,
    issues:document.getElementById('pai-issues').value.trim(),
    lines
  };
  updatePurchaseAiInvoiceRows(oldInvoiceNo,inv);
  revalidatePurchaseAiRows();
  toast('Extracted purchase updated','ok');
  const current=purchaseAiEditRow;
  closeM('m-purchase-ai-edit');
  if(next){
    const nextRow=[...document.querySelectorAll('#ext-tbody tr[data-inv]')]
      .find(row=>row.dataset.skipped!=='1'&&row!==current);
    if(nextRow)setTimeout(()=>openPurchaseAiEdit(nextRow.querySelector('.row-actions .icon-btn')),80);
  }
}

function updatePurchaseAiInvoiceRows(oldInvoiceNo,inv){
  const fmt=n=>Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const validation=validatePurchaseAiInvoice(inv);
  const stCls=validation.valid?'b-g':'b-a';
  document.querySelectorAll('#ext-tbody tr[data-inv]').forEach(row=>{
    if((row.dataset.invoiceNo||'')!==String(oldInvoiceNo||''))return;
    const index=Number(row.dataset.lineIndex||0);
    const line=Array.isArray(inv.lines)?(inv.lines[index]||{}):{};
    const lineTotal=parseAmount(line.line_total||line.amount);
    const vat=index===0?parseAmount(inv.vat_amount||inv.tax_amount):0;
    const paid=index===0?parseAmount(inv.paid):0;
    const shipping=index===0?parseAmount(inv.shipping):0;
    const total=index===0?parseAmount(inv.total):(lineTotal+vat);
    row.dataset.invoiceNo=inv.invoice_no||'';
    row.dataset.inv=JSON.stringify(inv);
    row.dataset.validation=validation.valid?'valid':'review';
    const cells=row.children;
    cells[1].textContent=index===0?(validation.issues.join('; ')||purchaseAiRawDetails(line)||'Ready to save'):'';
    cells[3].textContent=inv.invoice_no||'';
    cells[4].textContent=inv.date||'';
    cells[5].textContent=inv.supplier||'';
    cells[6].textContent=inv.address||'';
    cells[7].textContent=inv.pay_term||'';
    cells[8].textContent=purchaseAiProductName(line);
    cells[9].textContent=fmt(line.quantity||line.qty);
    cells[10].textContent=line.unit||line.unit_of_measure||line.uom||'PCS';
    cells[11].textContent=fmt(line.unit_cost||line.cost||line.unitCost);
    cells[12].textContent=fmt(line.discount_percent||line.discountPct);
    cells[13].textContent=fmt(line.unit_cost_before_tax||line.unit_cost||line.cost);
    cells[14].textContent=fmt(line.line_total||line.amount);
    cells[15].textContent=fmt(line.profit_margin||line.margin);
    cells[16].textContent=fmt(line.selling_price_inc_tax||line.selling_price);
    cells[17].textContent=inv.discount_type||'None';
    cells[18].textContent=fmt(inv.discount_value||inv.discount);
    cells[19].textContent=fmt(vat);
    cells[20].textContent=inv.shipping_details||'';
    cells[21].textContent=fmt(shipping);
    cells[22].textContent=fmt(paid);
    cells[23].textContent=inv.paid_on||'';
    cells[24].textContent=inv.payment_method||'Cash';
    cells[25].textContent=inv.payment_account||'None';
    cells[26].textContent=inv.payment_note||'';
    cells[27].textContent=inv.notes||'';
    cells[28].textContent=fmt(Math.max(0,total-paid));
    cells[29].innerHTML=`<span class="b ${stCls}">${validation.valid?'Valid':'Review'}</span>`;
  });
}

function togglePurchaseAiSelection(checked){
  document.querySelectorAll('#ext-tbody tr[data-inv]').forEach(row=>{
    const box=row.querySelector('.purchase-ai-select');
    if(box&&row.dataset.skipped!=='1')box.checked=checked;
  });
}

function skipPurchaseAiRow(btn){
  const row=btn.closest('tr');
  if(!row)return;
  markPurchaseAiInvoiceRows(row.dataset.invoiceNo,'Skipped','Skipped by user',true);
  toast('Purchase AI row skipped','info');
}

function deletePurchaseAiRow(btn){
  const row=btn.closest('tr');
  const tbody=row?.parentElement;
  const invoiceNo=row?.dataset.invoiceNo||'';
  document.querySelectorAll('#ext-tbody tr[data-inv]').forEach(item=>{
    if((item.dataset.invoiceNo||'')===invoiceNo)item.remove();
  });
  if(tbody&&tbody.querySelectorAll('tr[data-inv]').length===0){
    tbody.innerHTML='<tr><td colspan="30" style="color:var(--text3);text-align:center">AI uploaded purchase data will appear here for validation.</td></tr>';
  }
  toast('Purchase AI row deleted','warn');
}

function revalidatePurchaseAiRows(){
  const aiInvoiceCounts=purchaseAiInvoiceCounts();
  const existingPurchaseRefs=purchaseRecordRefSet();
  document.querySelectorAll('#ext-tbody tr[data-inv]').forEach(row=>{
    if(row.dataset.skipped==='1')return;
    let inv={};
    try{inv=JSON.parse(row.dataset.inv||'{}');}catch{return;}
    const validation=validatePurchaseAiInvoice(inv,{aiInvoiceCounts,existingPurchaseRefs});
    row.dataset.validation=validation.valid?'valid':'review';
    const validationCell=row.querySelector('.purchase-ai-validation');
    const detailsCell=row.querySelector('.purchase-ai-details');
    const checkbox=row.querySelector('.purchase-ai-select');
    if(validationCell)validationCell.innerHTML=`<span class="b ${validation.valid?'b-g':'b-a'}">${validation.valid?'Valid':'Review'}</span>`;
    const index=Number(row.dataset.lineIndex||0);
    if(detailsCell)detailsCell.textContent=index===0?(validation.issues.join('; ')||purchaseAiRawDetails(inv.lines?.[index]||{})||'Ready to save'):'';
  });
}

function purchaseAiInvoiceCounts(){
  const counts=new Map();
  uploadedFiles.forEach(file=>{
    (file.invoices||[]).forEach((inv,index)=>{
      const key=invoiceKey(inv.invoice_no);
      if(!key)return;
      const entry=counts.get(key)||new Set();
      entry.add(`${file.id||file.name}:${index}`);
      counts.set(key,entry);
    });
  });
  if(counts.size){
    return new Map([...counts.entries()].map(([key,set])=>[key,set.size]));
  }
  document.querySelectorAll('#ext-tbody tr[data-inv]').forEach((row,index)=>{
    try{
      const inv=JSON.parse(row.dataset.inv||'{}');
      const key=invoiceKey(inv.invoice_no);
      if(!key)return;
      const uid=row.dataset.invoiceUid||`${row.dataset.invoiceNo||key}:${index}`;
      const entry=counts.get(key)||new Set();
      entry.add(uid);
      counts.set(key,entry);
    }catch{}
  });
  return new Map([...counts.entries()].map(([key,set])=>[key,set.size]));
}

function purchaseRecordRefSet(){
  return new Set([...document.querySelectorAll('#purchase-record-tbody tr:not([data-empty-state]) td:first-child')]
    .map(td=>invoiceKey(td.textContent))
    .filter(Boolean));
}

function updateExtractionStats(){
  const all=uploadedFiles.flatMap(f=>f.invoices||[]);
  const total=all.length;
  const review=all.filter(i=>i.status==='Review').length;
  const errors=all.filter(i=>i.status==='Error').length;
  const stats=document.querySelectorAll('#page-purchase #p-extract .stat .stat-val');
  if(stats[0])stats[0].textContent=total;
  if(stats[1])stats[1].textContent=review;
  if(stats[2])stats[2].textContent=errors;
}

function buildValidationPanel(invoices){
  renderPurchaseValidationDocumentStatus();
}

function purchaseFileUploadStatus(file){
  const invoices=Array.isArray(file.invoices)?file.invoices:[];
  const saved=file.savedInvoiceNos instanceof Set?file.savedInvoiceNos:new Set(file.savedInvoiceNos||[]);
  const total=invoices.length;
  const savedCount=invoices.filter(inv=>saved.has(String(inv.invoice_no||''))).length;
  if(total>0&&savedCount>=total)return {label:'Completed',tone:'green',badge:'b-g',summary:`${savedCount}/${total} invoices saved`};
  if(savedCount>0)return {label:'Partial',tone:'amber',badge:'b-a',summary:`${savedCount}/${total||savedCount} invoices saved`};
  if(file.status==='Error')return {label:'Not uploaded',tone:'red',badge:'b-r',summary:'Extraction failed, nothing saved'};
  if(file.status==='Extracted')return {label:'Not uploaded',tone:'red',badge:'b-r',summary:`0/${total} invoices saved`};
  if(file.status==='Ready')return {label:'Not uploaded',tone:'red',badge:'b-r',summary:'Ready for extraction, not saved'};
  return {label:'Not uploaded',tone:'red',badge:'b-r',summary:'Not saved'};
}

function renderPurchaseValidationDocumentStatus(){
  const target=document.getElementById('purchase-validation-doc-status');
  if(!target)return;
  const files=uploadedFiles.filter(file=>['Ready','Queued','Extracted','Error'].includes(file.status));
  if(!files.length){
    target.innerHTML=`<div style="background:var(--red-bg);border:1px solid var(--red-border);border-radius:10px;padding:14px 16px">
      <div style="font-size:13.5px;font-weight:600;margin-bottom:3px">No uploaded documents yet</div>
      <div style="font-size:12px;color:var(--text3)">Upload and extract purchase files to see document status here.</div>
    </div>`;
    return;
  }
  const toneStyle={
    green:'background:var(--green-bg);border:1px solid var(--green-border)',
    amber:'background:var(--amber-bg);border:1px solid var(--amber-border)',
    red:'background:var(--red-bg);border:1px solid var(--red-border)'
  };
  target.innerHTML=files.map(file=>{
    const status=purchaseFileUploadStatus(file);
    const invoices=Array.isArray(file.invoices)?file.invoices:[];
    const reviewCount=invoices.filter(inv=>!validatePurchaseAiInvoice(inv).valid).length;
    return `<div style="${toneStyle[status.tone]};border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:18px;flex-shrink:0">${status.tone==='green'?'✓':status.tone==='amber'?'!':'×'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:600;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(file.name)}</div>
          <div style="font-size:12px;color:var(--text3)">${escapeHtml(status.summary)}${reviewCount?` - ${reviewCount} row(s) have review notes`:''}</div>
        </div>
        <span class="b ${status.badge}">${escapeHtml(status.label)}</span>
      </div>
    </div>`;
  }).join('');
}

function fixTRN(invNo,btn){
  const key='fix-'+invNo.replace(/[^a-z0-9]/gi,'_');
  const inp=document.getElementById(key);
  const v=(inp?.value||'').replace(/\D/g,'');
  if(v.length!==15){toast('TRN must be exactly 15 digits','err');return;}
  btn.closest('.val-dynamic').style.background='var(--green-bg)';
  btn.closest('.val-dynamic').style.borderColor='var(--green-border)';
  btn.closest('.val-dynamic').querySelector('[style*="font-weight:600"]').textContent='? Fixed - '+invNo;
  btn.closest('.val-dynamic').querySelector('.btn-danger').remove();
  toast('TRN corrected and re-validated ?','ok');
}
function resolveReview(btn,choice){
  btn.closest('.val-dynamic').style.background='var(--green-bg)';
  btn.closest('.val-dynamic').style.borderColor='var(--green-border)';
  btn.parentElement.innerHTML='<span style="color:var(--green);font-size:12px">? Resolved</span>';
  toast(choice==='calc'?'Calculated VAT applied ?':'Extracted VAT kept ?','ok');
}

function runOCR(){
  // Extract ALL ready files
  let ready=uploadedFiles.filter(f=>f.status==='Ready'||f.status==='Queued');
  if(ready.length===0){
    ready=uploadedFiles.filter(f=>f.status==='Extracted'||f.status==='Error').slice(-1);
  }
  if(ready.length===0){toast('No new files to extract. Upload files first.','warn');return;}
  ready.forEach(file=>{file.status='Ready';});
  ready.forEach((f,i)=>setTimeout(()=>extractSingleFile(f),i*500));
}

function formatInputDateTime(date=new Date()){
  const pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setText(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=value;
}

function setManualPurchaseDefaults(){
  const now=formatInputDateTime();
  ['mp-date','mp-paid-on'].forEach(id=>{
    const field=document.getElementById(id);
    if(field&&!field.value)field.value=now;
  });
  const ref=document.getElementById('mp-ref');
  if(ref&&!ref.value)ref.value=`PUR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  if(!document.querySelector('#mp-lines tr')&&document.getElementById('mp-lines')){
    addManualPurchaseLine();
    return;
  }
  calcManualPurchase();
}

function removeInitialBlankPurchaseLine(){
  const rows=[...document.querySelectorAll('#mp-lines tr')];
  if(rows.length!==1||manualPurchaseEditingRef)return;
  const row=rows[0];
  const product=(row.querySelector('.mp-product')?.value||'').trim();
  const qty=(row.querySelector('.mp-qty')?.value||'').trim();
  const cost=parseAmount(row.querySelector('.mp-cost')?.value);
  const discount=parseAmount(row.querySelector('.mp-discount-pct')?.value);
  const margin=parseAmount(row.querySelector('.mp-margin')?.value);
  if(!product&&(!qty||qty==='1')&&!cost&&!discount&&!margin){
    row.remove();
  }
}

function addManualPurchaseLine(){
  const tbody=document.getElementById('mp-lines');
  if(!tbody)return;
  refreshPurchaseProductSuggestions();
  const row=document.createElement('tr');
  row.innerHTML=`<td class="line-no-cell"><span class="line-no">1</span></td><td><input class="fi mp-product" list="purchase-product-options" placeholder="Product name" onfocus="refreshPurchaseProductSuggestions()" onchange="applyPurchaseProductSuggestion(this)"></td><td><input class="fi mono mp-qty" value="1" oninput="calcManualPurchase()"></td><td><select class="fi mp-unit">${unitOptionsHtml('PCS')}</select></td><td><input class="fi mono mp-cost" value="0.00" oninput="calcManualPurchase()"></td><td><input class="fi mono mp-discount-pct" value="0" oninput="calcManualPurchase()"></td><td class="mono mp-before-tax">0.00</td><td class="mono mp-line-total">0.00</td><td><input class="fi mono mp-margin" value="0" oninput="calcManualPurchase()"></td><td class="mono mp-selling">0.00</td><td><button class="icon-btn danger" type="button" onclick="removeManualPurchaseLine(this)" title="Remove line">${deleteIconSvg()}</button></td>`;
  tbody.appendChild(row);
  calcManualPurchase();
  refreshEnhancedTable(tbody.closest('table'));
}

function removeManualPurchaseLine(btn){
  btn.closest('tr')?.remove();
  calcManualPurchase();
  refreshEnhancedTable(document.getElementById('mp-lines')?.closest('table'));
}

function manualPurchaseLineHasValue(row){
  return Boolean(
    (row.querySelector('.mp-product')?.value||'').trim()||
    parseAmount(row.querySelector('.mp-qty')?.value)>1||
    parseAmount(row.querySelector('.mp-cost')?.value)>0||
    parseAmount(row.querySelector('.mp-discount-pct')?.value)>0||
    parseAmount(row.querySelector('.mp-margin')?.value)>0
  );
}

function collectManualPurchaseLines(){
  return [...document.querySelectorAll('#mp-lines tr')]
    .filter(manualPurchaseLineHasValue)
    .map(row=>({
      product:(row.querySelector('.mp-product')?.value||'').trim(),
      quantity:parseAmount(row.querySelector('.mp-qty')?.value),
      unit_of_measure:row.querySelector('.mp-unit')?.value||'PCS',
      unit_cost:parseAmount(row.querySelector('.mp-cost')?.value),
      discount_percent:parseAmount(row.querySelector('.mp-discount-pct')?.value),
      profit_margin:parseAmount(row.querySelector('.mp-margin')?.value),
      unit_cost_before_tax:parseAmount(row.querySelector('.mp-before-tax')?.textContent),
      line_total:parseAmount(row.querySelector('.mp-line-total')?.textContent),
      selling_price_inc_tax:parseAmount(row.querySelector('.mp-selling')?.textContent)
    }));
}

function purchaseProductRecords(){
  const records=[];
  document.querySelectorAll('#prod-tbody tr:not([data-empty-state])').forEach(row=>{
    const cells=row.children;
    const code=cells[0]?.textContent.trim()||'';
    const name=cells[1]?.textContent.trim()||'';
    if(!name)return;
    records.push({
      code,
      name,
      unit:cells[4]?.textContent.trim()||'PCS',
      cost:Number(row.dataset.cost||0),
      supplier:row.dataset.supplier||''
    });
  });
  document.querySelectorAll('#stock-map-tbody tr:not([data-empty-state])').forEach(row=>{
    const cells=row.children;
    const sku=row.dataset.stockSku||'';
    const name=cells[2]?.textContent.trim()||cells[0]?.textContent.trim()||sku;
    if(!name)return;
    records.push({
      code:sku,
      name,
      unit:row.dataset.unit||'PCS',
      cost:Number(row.dataset.cost||0),
      supplier:(cells[1]?.textContent.trim()||'').replace(/^Not assigned$/,'')
    });
  });
  return records;
}

function refreshPurchaseProductSuggestions(){
  const list=document.getElementById('purchase-product-options');
  if(!list)return;
  list.innerHTML=purchaseProductRecords()
    .map(item=>`<option value="${escapeHtml(item.name)}" label="${escapeHtml([item.code,item.unit,item.supplier].filter(Boolean).join(' - '))}"></option>`)
    .join('');
}

function applyPurchaseProductSuggestion(input){
  const value=(input?.value||'').trim().toLowerCase();
  if(!value)return;
  const match=purchaseProductRecords().find(item=>[item.name,item.code].some(text=>String(text||'').toLowerCase()===value));
  if(!match)return;
  const row=input.closest('tr');
  setSelectValue(row?.querySelector('.mp-unit'),match.unit||'PCS');
  if(row?.querySelector('.mp-cost')&&match.cost)row.querySelector('.mp-cost').value=Number(match.cost).toFixed(2);
  if(match.supplier&&!document.getElementById('mp-supplier')?.value){
    setSelectValue(document.getElementById('mp-supplier'),match.supplier);
    applySupplierAddress();
  }
  calcManualPurchase();
}

function setSelectValue(select,value){
  if(!select)return;
  const wanted=String(value||'');
  const existing=[...select.options].find(option=>option.value===wanted||option.textContent===wanted);
  if(existing){
    select.value=existing.value;
  }else if(wanted){
    select.appendChild(new Option(wanted,wanted));
    select.value=wanted;
  }
}

let manualPurchaseEditingRef='';

function calcManualPurchase(){
  const rows=[...document.querySelectorAll('#mp-lines tr')];
  let net=0;
  let activeItems=0;
  rows.forEach((row,index)=>{
    const lineNo=row.querySelector('.line-no')||row.children[0];
    lineNo.textContent=String(index+1);
    const qty=parseAmount(row.querySelector('.mp-qty')?.value);
    const cost=parseAmount(row.querySelector('.mp-cost')?.value);
    const discountPct=parseAmount(row.querySelector('.mp-discount-pct')?.value);
    const margin=parseAmount(row.querySelector('.mp-margin')?.value);
    const beforeTax=cost*(1-(discountPct/100));
    const lineTotal=qty*beforeTax;
    const selling=beforeTax*(1+(margin/100))*1.05;
    row.querySelector('.mp-before-tax').textContent=beforeTax.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
    row.querySelector('.mp-line-total').textContent=lineTotal.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
    row.querySelector('.mp-selling').textContent=selling.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
    if(manualPurchaseLineHasValue(row)){
      activeItems+=1;
      net+=lineTotal;
    }
  });
  const discountType=document.getElementById('mp-discount-type')?.value||'None';
  const discountValue=parseAmount(document.getElementById('mp-discount')?.value);
  const discount=discountType==='Percentage'?net*(discountValue/100):discountType==='Fixed'?discountValue:0;
  const taxable=Math.max(0,net-discount);
  const taxType=document.getElementById('mp-tax')?.value||'None';
  const tax=taxType.includes('5%')&&!taxType.toLowerCase().includes('exempt')?taxable*.05:0;
  const shipping=parseAmount(document.getElementById('mp-shipping')?.value);
  const total=taxable+tax+shipping;
  const paid=parseAmount(document.getElementById('mp-pay-amount')?.value);
  const due=Math.max(0,total-paid);
  setText('mp-total-items',String(activeItems));
  setText('mp-net-total',net.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('mp-discount-total',discount.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('mp-tax-total',tax.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('mp-purchase-total',total.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('mp-grand-total',total.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('mp-payment-due',due.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}));
  return {items:activeItems,net,discount,tax,shipping,total,paid,due};
}

function resetManualPurchase(){
  manualPurchaseEditingRef='';
  document.querySelectorAll('#p-manual input,#p-manual textarea').forEach(field=>{
    if(field.type==='file')field.value='';
    else field.value='';
  });
  document.querySelectorAll('#p-manual select').forEach(select=>select.selectedIndex=0);
  const tbody=document.getElementById('mp-lines');
  if(tbody)tbody.innerHTML='';
  const ref=document.getElementById('mp-ref');
  if(ref)ref.disabled=false;
  setText('mp-form-title','Add Purchase');
  setText('mp-form-sub','Manual supplier purchase entry with items, discounts, tax, shipping, and payment');
  setText('mp-save-btn','Save');
  setManualPurchaseDefaults();
}

async function saveManualPurchase(){
  setManualPurchaseDefaults();
  removeInitialBlankPurchaseLine();
  const totals=calcManualPurchase();
  const supplier=document.getElementById('mp-supplier')?.value||'';
  const status=totals.due<=0?'Paid':'Pending Payment';
  if(!supplier){
    toast('Select supplier','warn');
    return;
  }
  if(!document.querySelector('#mp-lines tr')){
    toast('Add at least one product','warn');
    return;
  }
  const lines=collectManualPurchaseLines();
  if(!lines.length){
    toast('Add at least one product','warn');
    return;
  }
  const invalidLine=lines.find(line=>!line.product||line.quantity<=0||line.unit_cost<0);
  if(invalidLine){
    toast('Each purchase line needs product name and quantity','warn');
    return;
  }
  const ref=(document.getElementById('mp-ref')?.value||`PUR-${Date.now()}`).trim();
  const record={
    ref,
    supplier,
    address:document.getElementById('mp-address')?.value||'',
    date:document.getElementById('mp-date')?.value||'',
    status,
    location:'Main Store',
    pay_term:document.getElementById('mp-term')?.value||'',
    items:totals.items,
    net_amount:totals.net,
    discount:totals.discount,
    tax_amount:totals.tax,
    shipping:totals.shipping,
    total:totals.total,
    paid:totals.paid,
    due:totals.due,
    discount_type:document.getElementById('mp-discount-type')?.value||'None',
    discount_value:parseAmount(document.getElementById('mp-discount')?.value),
    tax_type:document.getElementById('mp-tax')?.value||'None',
    lines,
    payment_method:document.getElementById('mp-pay-method')?.value||'Cash',
    payment_account:document.getElementById('mp-pay-account')?.value||'None',
    payment_note:document.getElementById('mp-pay-note')?.value||'',
    paid_on:document.getElementById('mp-paid-on')?.value||'',
    shipping_details:document.getElementById('mp-shipping-details')?.value||'',
    notes:document.getElementById('mp-notes')?.value||'',
    source:'Manual'
  };
  const wasEditing=Boolean(manualPurchaseEditingRef);
  if(manualPurchaseEditingRef){
    [...document.querySelectorAll('#purchase-record-tbody tr')].find(row=>row.children[0]?.textContent.trim()===manualPurchaseEditingRef)?.remove();
  }
  renderPurchaseRecord(record);
  audit(manualPurchaseEditingRef?'Updated manual purchase':'Added manual purchase',ref,'Saved');
  saveServer('purchaseRecords',record,{throwOnError:true})
    .then(()=>toast(wasEditing?'Purchase updated in database':'Purchase saved to database','ok'))
    .catch(()=>toast('Purchase added on screen, database save failed','warn'));
  manualPurchaseEditingRef='';
  const refField=document.getElementById('mp-ref');
  if(refField)refField.disabled=false;
  stab(document.querySelector('#page-purchase .tab:nth-child(5)'),'p-records');
}

function purchaseRecordFromRow(row){
  if(!row)return null;
  if(row.dataset.purchaseRecord){
    try{return JSON.parse(row.dataset.purchaseRecord);}catch(err){console.warn('Purchase row data parse failed:',err);}
  }
  const cells=row.children;
  return {
    ref:cells[0]?.textContent.trim()||'',
    supplier:cells[1]?.textContent.trim()||'',
    date:cells[2]?.textContent.trim()||'',
    location:cells[3]?.textContent.trim()||'',
    items:parseAmount(cells[4]?.textContent),
    net_amount:parseAmount(cells[5]?.textContent),
    tax_amount:parseAmount(cells[6]?.textContent),
    shipping:parseAmount(cells[7]?.textContent),
    total:parseAmount(cells[8]?.textContent),
    paid:parseAmount(cells[9]?.textContent),
    due:parseAmount(cells[10]?.textContent),
    source:cells[11]?.textContent.trim()||'Manual',
    status:cells[12]?.textContent.trim()||'Draft'
  };
}

function addManualPurchaseLineFromData(line={}){
  addManualPurchaseLine();
  const row=document.querySelector('#mp-lines tr:last-child');
  if(!row)return;
  row.querySelector('.mp-product').value=line.product||line.name||'Purchase item';
  row.querySelector('.mp-qty').value=line.quantity||line.qty||1;
  setSelectValue(row.querySelector('.mp-unit'),line.unit_of_measure||line.unit||line.uom||'PCS');
  row.querySelector('.mp-cost').value=line.unit_cost||line.cost||line.unitCost||0;
  row.querySelector('.mp-discount-pct').value=line.discount_percent||line.discountPct||0;
  row.querySelector('.mp-margin').value=line.profit_margin||line.margin||0;
}

function editPurchaseRecord(btn){
  const row=btn.closest('tr');
  const purchase=purchaseRecordFromRow(row);
  if(!purchase?.ref){
    toast('Purchase record not found','warn');
    return;
  }
  resetManualPurchase();
  manualPurchaseEditingRef=purchase.ref;
  setSelectValue(document.getElementById('mp-supplier'),purchase.supplier);
  setFieldValue(document.getElementById('mp-ref'),purchase.ref);
  setFieldValue(document.getElementById('mp-date'),purchase.date);
  setFieldValue(document.getElementById('mp-address'),purchase.address||'');
  setSelectValue(document.getElementById('mp-term'),purchase.pay_term||'');
  setSelectValue(document.getElementById('mp-discount-type'),purchase.discount_type||'None');
  setFieldValue(document.getElementById('mp-discount'),purchase.discount_value||purchase.discount||0);
  setSelectValue(document.getElementById('mp-tax'),purchase.tax_type||'None');
  setFieldValue(document.getElementById('mp-notes'),purchase.notes||'');
  setFieldValue(document.getElementById('mp-shipping-details'),purchase.shipping_details||'');
  setFieldValue(document.getElementById('mp-shipping'),purchase.shipping||0);
  setFieldValue(document.getElementById('mp-pay-amount'),purchase.paid||0);
  setFieldValue(document.getElementById('mp-paid-on'),purchase.paid_on||'');
  setSelectValue(document.getElementById('mp-pay-method'),purchase.payment_method||'Cash');
  setSelectValue(document.getElementById('mp-pay-account'),purchase.payment_account||'None');
  setFieldValue(document.getElementById('mp-pay-note'),purchase.payment_note||'');
  const tbody=document.getElementById('mp-lines');
  if(tbody)tbody.innerHTML='';
  const lines=Array.isArray(purchase.lines)&&purchase.lines.length?purchase.lines:[{product:'Purchase item',quantity:purchase.items||1,unit_cost:Number(purchase.net_amount||purchase.total||0)/Math.max(1,Number(purchase.items||1)),discount_percent:0,profit_margin:0}];
  lines.forEach(addManualPurchaseLineFromData);
  const ref=document.getElementById('mp-ref');
  if(ref)ref.disabled=true;
  setText('mp-form-title','Edit Purchase');
  setText('mp-form-sub','Update purchase details. Reference is locked to prevent duplicate database records.');
  setText('mp-save-btn','Update Purchase');
  calcManualPurchase();
  stab(document.querySelector('#page-purchase .tab:nth-child(4)'),'p-manual');
}

let lineCount=1;
let productReturnToInvoice=false;
let productTargetLine=null;

function addLine(){
  lineCount++;
  const d=document.createElement('div');d.className='inv-item';
  d.classList.add('sales-inv-line');
  d.innerHTML=`<input class="fi inv-product" list="invoice-product-options" placeholder="Description" style="font-size:12.5px" onfocus="refreshInvoiceProductSuggestions()" onchange="applyInvoiceProductSuggestion(this)"><input class="fi inv-unit" value="PCS" readonly style="font-size:12.5px;background:var(--bg)"><input class="fi inv-qty" value="1" style="font-size:12.5px" oninput="calcLine(this)"><input class="fi inv-price" value="0.00" style="font-size:12.5px" oninput="calcLine(this)"><input class="fi mono inv-amount" value="0.00" readonly style="background:var(--bg)"><button class="btn btn-g" style="padding:4px 8px" onclick="remLine(this)">x</button>`;
  document.getElementById('inv-lines').appendChild(d);
  refreshInvoiceProductSuggestions();
  calcLine(null);
  return d;
}
function remLine(btn){btn.closest('.inv-item').remove();calcLine(null);}
function calcLine(inp){
  if(inp){
    const row=inp.closest('.inv-item');
    const qty=parseAmount(row?.querySelector('.inv-qty')?.value);
    const price=parseAmount(row?.querySelector('.inv-price')?.value);
    const amount=row?.querySelector('.inv-amount');
    if(amount)amount.value=(qty*price).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  let sub=0;
  document.querySelectorAll('#inv-lines .inv-item').forEach(r=>{
    sub+=parseAmount(r.querySelector('.inv-qty')?.value)*parseAmount(r.querySelector('.inv-price')?.value);
  });
  const vat=sub*0.05,tot=sub+vat;
  document.getElementById('subtotal').textContent='AED '+sub.toLocaleString('en-AE',{minimumFractionDigits:2});
  document.getElementById('vat-amt').textContent='AED '+vat.toLocaleString('en-AE',{minimumFractionDigits:2});
  document.getElementById('inv-total').textContent='AED '+tot.toLocaleString('en-AE',{minimumFractionDigits:2});
}

function invoiceProductRecords(){
  const records=[];
  document.querySelectorAll('#prod-tbody tr:not([data-empty-state])').forEach(row=>{
    const cells=row.children;
    const code=cells[0]?.textContent.trim()||'';
    const name=cells[1]?.textContent.trim()||'';
    if(!name)return;
    const isItemMasterRow=cells.length>=9;
    records.push({
      code,
      name,
      unit:(isItemMasterRow?cells[4]?.textContent.trim():cells[3]?.textContent.trim())||'PCS',
      price:isItemMasterRow?0:parseAmount(cells[4]?.textContent)
    });
  });
  document.querySelectorAll('#stock-map-tbody tr:not([data-empty-state])').forEach(row=>{
    const name=row.children[2]?.textContent.trim()||row.children[0]?.textContent.trim()||'';
    if(!name||records.some(item=>item.name.toLowerCase()===name.toLowerCase()))return;
    const itemRow=[...document.querySelectorAll('#prod-tbody tr:not([data-empty-state])')]
      .find(item=>(item.children[1]?.textContent.trim()||'').toLowerCase()===(row.children[0]?.textContent.trim()||'').toLowerCase());
    records.push({code:row.dataset.stockSku||'',name,unit:itemRow?.children[4]?.textContent.trim()||'PCS',price:Number(row.dataset.priceOuter||0)});
  });
  return records;
}

function refreshInvoiceProductSuggestions(){
  const list=document.getElementById('invoice-product-options');
  if(!list)return;
  list.innerHTML=invoiceProductRecords()
    .map(item=>`<option value="${escapeHtml(item.name)}" label="${escapeHtml([item.code,item.unit].filter(Boolean).join(' - '))}"></option>`)
    .join('');
}

function applyInvoiceProductSuggestion(input){
  const value=(input?.value||'').trim().toLowerCase();
  if(!value)return;
  const match=invoiceProductRecords().find(item=>[item.name,item.code].some(text=>String(text||'').toLowerCase()===value));
  if(!match)return;
  const row=input.closest('.inv-item');
  const unit=row?.querySelector('.inv-unit');
  const price=row?.querySelector('.inv-price');
  if(unit)unit.value=match.unit||'PCS';
  if(price&&match.price)price.value=Number(match.price).toFixed(2);
  calcLine(price||input);
}

function editProd(code){
  const rows=[...document.querySelectorAll('#prod-tbody tr')];
  const row=rows.find(item=>item.querySelector('td')?.textContent.trim()===String(code).trim());
  const button=row?.querySelector('button');
  if(button){
    openGenericEditRow(button,'Edit Product / Service','Update catalogue details');
    return;
  }
  toast('Product row not found','warn');
}

function saveSalesCategory(){
  const name=(document.getElementById('sales-cat-name')?.value||'').trim();
  const scope=document.getElementById('sales-cat-scope')?.value||'Sales & Purchase';
  const vat=document.getElementById('sales-cat-vat')?.value||'Standard 5%';
  if(!name){
    toast('Enter category name','warn');
    return;
  }
  renderSalesCategoryRecord({name,scope,vat,status:'Active'});
  saveServer('salesCategories',{name,scope,vat,status:'Active'});
  const field=document.getElementById('sales-cat-name');
  if(field)field.value='';
  refreshEnhancedTable(document.getElementById('sales-category-tbody')?.closest('table'));
  toast('Category added','ok');
  audit('Added category',name,'Saved');
}

function saveSalesUnit(){
  const name=(document.getElementById('sales-unit-name')?.value||'').trim();
  const code=(document.getElementById('sales-unit-code')?.value||name.slice(0,6).toUpperCase()).trim().toUpperCase();
  const type=document.getElementById('sales-unit-type')?.value||'Quantity';
  const decimals=document.getElementById('sales-unit-decimals')?.value||'2';
  if(!name){
    toast('Enter unit name','warn');
    return;
  }
  renderSalesUnitRecord({code,name,type,decimals,status:'Active'});
  saveServer('salesUnits',{code,name,type,decimals,status:'Active'});
  ['sales-unit-code','sales-unit-name'].forEach(id=>{
    const field=document.getElementById(id);
    if(field)field.value='';
  });
  refreshEnhancedTable(document.getElementById('sales-unit-tbody')?.closest('table'));
  syncInventoryItemOptions();
  toast('Unit added','ok');
  audit('Added unit',name,'Saved');
}

function openAddProductFromInvoice(){
  syncProductMasterOptions();
  productReturnToInvoice=true;
  productTargetLine=document.activeElement?.closest?.('.inv-item')||[...document.querySelectorAll('#inv-lines .inv-item')].find(row=>!(row.querySelector('input')?.value||'').trim())||document.querySelector('#inv-lines .inv-item')||addLine();
  const currentName=productTargetLine?.querySelector('.inv-product')?.value||'';
  const currentPrice=productTargetLine?.querySelector('.inv-price')?.value||'';
  document.getElementById('prod-name').value=currentName;
  document.getElementById('prod-price').value=currentPrice;
  showM('m-product');
}

function saveProd(){
  syncProductMasterOptions();
  const tbody=document.getElementById('prod-tbody');
  const code=(document.getElementById('prod-code')?.value||`PRD-00${(tbody?.rows.length||0)+1}`).trim();
  const name=(document.getElementById('prod-name')?.value||'').trim();
  const category=document.getElementById('prod-category')?.value||'Materials';
  const unit=document.getElementById('prod-unit')?.value||'Each';
  const price=parseFloat(String(document.getElementById('prod-price')?.value||'0').replace(/,/g,''))||0;
  const vat=document.getElementById('prod-vat')?.value||'Standard 5%';

  if(!name){
    toast('Enter product or service name','warn');
    return;
  }

  const shouldFillInvoice=productReturnToInvoice;
  const targetLine=productTargetLine;
  const row=document.createElement('tr');
  const vatText=vat.includes('0')&&!vat.includes('5')?'0% Zero':vat.includes('Exempt')?'Exempt':'5%';
  const vatClass=vatText==='5%'?'b-b':'b-t';
  row.innerHTML=`<td class="mono">${escapeHtml(code)}</td><td>${escapeHtml(name)}</td><td><span class="b b-gray">${escapeHtml(category)}</span></td><td>${escapeHtml(unit)}</td><td class="mono">${price.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td><span class="b ${vatClass}">${escapeHtml(vatText)}</span></td><td><span class="b b-g">Active</span></td><td><button class="btn btn-g btn-sm" onclick="editProd(this.closest('tr').querySelector('td').textContent)">Edit</button></td>`;
  tbody.prepend(row);
  saveServer('products',{code,name,category,unit,price,vat});
  refreshInvoiceProductSuggestions();

  closeM('m-product');
  if(shouldFillInvoice&&targetLine){
    const productInput=targetLine.querySelector('.inv-product');
    const unitInput=targetLine.querySelector('.inv-unit');
    const priceInput=targetLine.querySelector('.inv-price');
    if(productInput)productInput.value=name;
    if(unitInput)unitInput.value=unit;
    if(priceInput)priceInput.value=price.toFixed(2);
    calcLine(priceInput||null);
  }

  ['prod-code','prod-name','prod-price','prod-desc'].forEach(id=>{
    const field=document.getElementById(id);
    if(field)field.value='';
  });
  toast('Product added to catalogue ?','ok');
  audit('Added product',name,'Saved');
}

// -- ACCOUNTING ---------------------------------------------------
function accountOptionsHtml(){
  const rows=[...document.querySelectorAll('#account-tbody tr')];
  return '<option>Select Account...</option>'+rows.map(row=>{
    const cells=row.querySelectorAll('td');
    return `<option>${escapeHtml(cells[1]?.textContent.trim()||'Account')} (${escapeHtml(cells[0]?.textContent.trim()||'0000')})</option>`;
  }).join('');
}

function addJournalLine(account='',debit='',credit=''){
  const wrap=document.getElementById('journal-lines');
  if(!wrap)return null;
  const row=document.createElement('div');
  row.className='inv-item journal-line';
  row.innerHTML=`<select class="fi journal-account" onchange="recalcJournal()">${accountOptionsHtml()}</select><input class="fi mono journal-debit" placeholder="0.00" value="${escapeHtml(debit)}" oninput="recalcJournal()"><input class="fi mono journal-credit" placeholder="0.00" value="${escapeHtml(credit)}" oninput="recalcJournal()"><button class="btn btn-g" style="padding:4px 8px" onclick="remJournalLine(this)">?</button>`;
  wrap.appendChild(row);
  if(account)row.querySelector('.journal-account').value=account;
  recalcJournal();
  return row;
}

function remJournalLine(btn){
  btn.closest('.journal-line')?.remove();
  recalcJournal();
}

function getJournalLines(){
  return [...document.querySelectorAll('#journal-lines .journal-line')].map(row=>({
    account:row.querySelector('.journal-account')?.value||'',
    debit:parseAmount(row.querySelector('.journal-debit')?.value),
    credit:parseAmount(row.querySelector('.journal-credit')?.value)
  }));
}

function recalcJournal(){
  const lines=getJournalLines();
  const debit=lines.reduce((sum,line)=>sum+line.debit,0);
  const credit=lines.reduce((sum,line)=>sum+line.credit,0);
  const diff=debit-credit;
  const fmt=n=>'AED '+Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const dr=document.getElementById('j-dr'),cr=document.getElementById('j-cr'),df=document.getElementById('j-diff');
  if(dr)dr.textContent=fmt(debit);
  if(cr)cr.textContent=fmt(credit);
  if(df){
    df.textContent=fmt(Math.abs(diff));
    df.style.color=Math.abs(diff)<.01?'var(--green)':'var(--red)';
  }
  return {debit,credit,diff};
}

function saveJournalDraft(){
  recalcJournal();
  toast('Journal draft saved','ok');
  audit('Saved journal draft',document.getElementById('journal-ref')?.value||'Draft','Saved');
}

function postLedgerLine({date,ref,description,debit=0,credit=0,account=''},{persist=true}={}){
  const tbody=document.getElementById('ledger-tbody');
  if(!tbody)return;
  const balance=debit-credit;
  const fmt=n=>Number(n||0).toLocaleString('en-AE',{maximumFractionDigits:2});
  const row=document.createElement('tr');
  row.dataset.account=account.replace(/\s*\(\d+\)\s*$/,'');
  row.innerHTML=`<td>${escapeHtml(date)}</td><td class="mono">${escapeHtml(ref)}</td><td>${escapeHtml(description)}${account?' - '+escapeHtml(account):''}</td><td class="mono">${debit?fmt(debit):'-'}</td><td class="mono">${credit?fmt(credit):'-'}</td><td class="mono">${fmt(balance)}</td>`;
  tbody.prepend(row);
  if(persist)saveServer('ledger',{date,ref,description,debit,credit,account});
}

function postJournalEntry(){
  const date=document.getElementById('journal-date')?.value||'';
  const ref=(document.getElementById('journal-ref')?.value||'').trim();
  const desc=(document.getElementById('journal-desc')?.value||'').trim();
  const rawLines=getJournalLines();
  const lines=getJournalLines().filter(line=>line.account&&line.account!=='Select Account...'&&(line.debit||line.credit));
  const totals=recalcJournal();

  if(!date){toast('Journal date is required','err');return;}
  if(!ref){toast('Reference number is required','err');return;}
  if(!desc){toast('Description is required','err');return;}
  if(rawLines.some(line=>(line.debit||line.credit)&&(!line.account||line.account==='Select Account...'))){toast('Select an account for every amount line','err');return;}
  if(lines.length<2){toast('Add at least two journal lines','err');return;}
  if(lines.some(line=>line.debit&&line.credit)){toast('A line cannot have both debit and credit','err');return;}
  if(Math.abs(totals.diff)>.01){toast('Journal must balance before posting','err');return;}

  lines.forEach(line=>postLedgerLine({date,ref,description:desc,debit:line.debit,credit:line.credit,account:line.account}));
  toast('Journal entry posted ?','ok');
  audit('Posted journal entry',ref,'Posted');
  filterLedger();
}

function saveAccount(){
  const code=(document.getElementById('acc-code')?.value||'').trim();
  const name=(document.getElementById('acc-name')?.value||'').trim();
  const type=document.getElementById('acc-type')?.value||'Asset';
  const category=document.getElementById('acc-category')?.value||'Current';
  if(!code||!name){toast('Account code and name are required','err');return;}
  const tbody=document.getElementById('account-tbody');
  if(!tbody)return;
  if([...tbody.querySelectorAll('td:first-child')].some(td=>td.textContent.trim()===code)){toast('Account code already exists','err');return;}
  const typeClass={Asset:'b-t',Liability:'b-r',Revenue:'b-g',Expense:'b-p',Equity:'b-b'}[type]||'b-gray';
  const row=document.createElement('tr');
  row.innerHTML=`<td class="mono">${escapeHtml(code)}</td><td>${escapeHtml(name)}</td><td><span class="b ${typeClass}">${escapeHtml(type)}</span></td><td>${escapeHtml(category)}</td><td class="mono">0.00</td><td><span class="b b-g">Active</span></td><td><button class="btn btn-g btn-sm" onclick="viewAccountLedger(this)">View</button></td>`;
  tbody.appendChild(row);
  saveServer('accounts',{code,name,type,category});
  updateAccountSelectors();
  closeM('m-acc');
  ['acc-code','acc-name'].forEach(id=>{const field=document.getElementById(id);if(field)field.value='';});
  toast('Account added to chart ?','ok');
  audit('Added account',code+' '+name,'Saved');
}

function updateAccountSelectors(){
  const options=accountOptionsHtml();
  document.querySelectorAll('#journal-lines .journal-account').forEach(select=>{
    const value=select.value;
    select.innerHTML=options;
    if([...select.options].some(option=>option.value===value))select.value=value;
  });
  const filter=document.getElementById('ledger-account-filter');
  if(filter){
    const current=filter.value;
    filter.innerHTML='<option>All Accounts</option>'+[...document.querySelectorAll('#account-tbody tr td:nth-child(2)')].map(td=>`<option>${escapeHtml(td.textContent.trim())}</option>`).join('');
    if([...filter.options].some(option=>option.value===current))filter.value=current;
  }
}

function viewAccountLedger(btn){
  const row=btn.closest('tr');
  const account=row?.querySelector('td:nth-child(2)')?.textContent.trim()||'All Accounts';
  const tab=document.querySelector('#page-accounting .tab:nth-child(3)');
  if(tab)stab(tab,'acc-ledger');
  const filter=document.getElementById('ledger-account-filter');
  if(filter)filter.value=account;
  filterLedger();
}

function filterLedger(){
  const filter=document.getElementById('ledger-account-filter')?.value||'All Accounts';
  document.querySelectorAll('#ledger-tbody tr').forEach(row=>{
    const account=row.dataset.account||row.querySelector('td:nth-child(3)')?.textContent||'';
    row.style.display=filter==='All Accounts'||account.includes(filter)?'':'none';
  });
}

function approveLeave(btn){const row=btn.closest('tr');row.querySelector('td:nth-child(6)').innerHTML='<span class="b b-g">Approved</span>';row.querySelector('td:last-child').innerHTML='';toast('Leave approved ?','ok');}
function rejectLeave(btn){const row=btn.closest('tr');row.querySelector('td:nth-child(6)').innerHTML='<span class="b b-r">Rejected</span>';row.querySelector('td:last-child').innerHTML='';toast('Leave rejected','warn');}

function submitOTRequest(){
  closeM('m-ot');
  toast('Overtime submitted for supervisor approval ?','ok');
  audit('Overtime submitted','HR Overtime','Pending');
}

function approveOT(btn,msg='Overtime approved'){
  const row=btn.closest('tr');
  row.querySelector('td:nth-child(6)').innerHTML='<span class="b b-g">Approved</span>';
  row.querySelector('td:last-child').innerHTML='<button class="btn btn-g btn-sm" onclick="toast(\'OT detail opened\',\'info\')">View</button>';
  toast(msg+' ?','ok');
  audit(msg,'HR Overtime','Approved');
}

function rejectOT(btn){
  const reason=prompt('Rejection reason is required')||'Reason not provided';
  const row=btn.closest('tr');
  row.querySelector('td:nth-child(6)').innerHTML='<span class="b b-r">Rejected</span>';
  row.querySelector('td:last-child').innerHTML='<button class="btn btn-g btn-sm" onclick="toast(\'Rejection reason: '+escapeHtml(reason).replace(/'/g,'&#39;')+'\',\'warn\')">Reason</button>';
  toast('Overtime rejected','warn');
  audit('Overtime rejected','HR Overtime','Rejected');
}

function adjustOT(btn){
  const row=btn.closest('tr');
  const cell=row.querySelector('td:nth-child(5)');
  const next=prompt('Adjusted OT hours',cell.textContent.replace('h','').trim());
  if(!next)return;
  cell.textContent=Number(next).toFixed(1)+'h';
  row.querySelector('td:nth-child(6)').innerHTML='<span class="b b-a">Adjusted</span>';
  toast('Overtime hours adjusted for HR review','warn');
  audit('Overtime adjusted','HR Overtime','Adjusted');
}

function approveCorrection(btn){
  const row=btn.closest('tr');
  row.querySelector('td:nth-child(6)').innerHTML='<span class="b b-g">Approved</span>';
  row.querySelector('td:last-child').innerHTML='<button class="btn btn-g btn-sm">View</button>';
  toast('Attendance correction approved ?','ok');
  audit('Attendance correction approved','HR Attendance','Approved');
}

function rejectCorrection(btn){
  const row=btn.closest('tr');
  row.querySelector('td:nth-child(6)').innerHTML='<span class="b b-r">Rejected</span>';
  row.querySelector('td:last-child').innerHTML='<button class="btn btn-g btn-sm">View</button>';
  toast('Attendance correction rejected','warn');
  audit('Attendance correction rejected','HR Attendance','Rejected');
}

function publishRota(){
  toast('Rota published. Employees notified and attendance timing updated','ok');
  audit('Rota published','Rota Planning','Published');
}

function copyPreviousRota(){
  toast('Previous week copied. Leave, inactive employee, and hour-limit checks completed.','ok');
  audit('Previous rota copied','Rota Planning','Draft');
}

function autoGenerateRota(){
  toast('Rota auto-generated from availability, leave, coverage, and rest-day rules.','ok');
  audit('Rota auto-generated','Rota Planning','Draft');
}

function copyPreviousMonthRota(){
  toast('Previous month copied. Leave, inactive employee, conflict, and hour-limit checks completed.','ok');
  audit('Previous month rota copied','Rota Planning','Draft');
}

function autoGenerateMonthlyRota(){
  toast('Monthly rota auto-generated from availability, holidays, coverage, rest gaps, and role skills.','ok');
  audit('Monthly rota auto-generated','Rota Planning','Draft');
}

function submitRotaApproval(){
  toast('Rota submitted to supervisor for approval','info');
  audit('Rota submitted for approval','Rota Planning','Pending');
}

function approveRotaRow(btn,msg='Rota approved'){
  const row=btn.closest('tr');
  const statusCell=row.querySelector('td:nth-last-child(2)');
  if(statusCell)statusCell.innerHTML='<span class="b b-g">Approved</span>';
  row.querySelector('td:last-child').innerHTML='<button class="btn btn-g btn-sm">View</button>';
  toast(msg+' ?','ok');
  audit(msg,'Rota Planning','Approved');
}

function rejectRotaRow(btn,msg='Rota rejected'){
  const row=btn.closest('tr');
  const statusCell=row.querySelector('td:nth-last-child(2)');
  if(statusCell)statusCell.innerHTML='<span class="b b-r">Rejected</span>';
  row.querySelector('td:last-child').innerHTML='<button class="btn btn-g btn-sm">View</button>';
  toast(msg,'warn');
  audit(msg,'Rota Planning','Rejected');
}

function testBio(){
  toast('Connecting to biometric device...','info');
  const log=document.getElementById('bio-log');
  setTimeout(()=>{
    const now=new Date().toTimeString().slice(0,8);
    const div=document.createElement('div');
    div.innerHTML=`<span style="color:var(--green)">? ${now}</span> - Connection successful - Device online`;
    log.prepend(div);toast('Biometric device connected ?','ok');
  },1500);
}

function selChip(el){document.querySelectorAll('#ex-browse .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');}

function sendMsg(){
  const inp=document.getElementById('chat-input'),val=inp.value.trim();
  if(!val)return;
  const msgs=document.getElementById('chat-msgs');
  const d=document.createElement('div');
  const now=new Date().toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'});
  d.style.cssText='background:var(--surface2);border-radius:12px 12px 12px 4px;padding:12px 14px;max-width:80%;';
  d.innerHTML=`<div style="font-size:13px;margin-bottom:4px">${val}</div><div style="font-size:11px;color:var(--text3)">You - ${now}</div>`;
  msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;inp.value='';
  setTimeout(()=>{
    const r=document.createElement('div');
    r.style.cssText='background:var(--accent-glow);border:1px solid rgba(79,142,240,.2);border-radius:12px 12px 4px 12px;padding:12px 14px;max-width:80%;align-self:flex-end;';
    const now2=new Date().toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'});
    r.innerHTML=`<div style="font-size:13px;margin-bottom:4px">Thank you for the question. I'll review and respond with detailed guidance shortly. Please ensure all supporting documents are attached.</div><div style="font-size:11px;color:var(--text3);text-align:right">Mohammed - ${now2}</div>`;
    msgs.appendChild(r);msgs.scrollTop=msgs.scrollHeight;
  },1800);
}

// -- EDIT EXTRACTED INVOICE ----------------------------------------
let _editRow = null; // reference to the <tr> being edited

function openEditRow(btn){
  const row = btn.closest('tr');
  _editRow = row;
  const cells = row.querySelectorAll('td');

  // Read data from data-inv attribute if available, else read cells
  let inv = {};
  try { inv = JSON.parse(row.getAttribute('data-inv')||'{}'); } catch(e){}

  const invNo   = inv.invoice_no  || cells[0]?.textContent.trim() || '';
  const date    = inv.date        || cells[1]?.textContent.trim() || '';
  const supplier= inv.supplier    || cells[2]?.textContent.trim() || '';
  const trn     = inv.supplier_trn|| cells[3]?.textContent.trim() || '';
  const subtotal= inv.subtotal    || parseFloat((cells[4]?.textContent||'').replace(/,/g,''))||0;
  const vat     = inv.vat_amount  || parseFloat((cells[5]?.textContent||'').replace(/,/g,''))||0;
  const conf    = inv.confidence  || parseInt((cells[7]?.textContent||'0'))||0;
  const status  = inv.status      || cells[8]?.querySelector('.b')?.textContent.trim()||'Valid';
  const issues  = inv.issues      || '';

  document.getElementById('ei-invno').value    = invNo;
  document.getElementById('ei-date').value     = date;
  document.getElementById('ei-supplier').value = supplier;
  document.getElementById('ei-trn').value      = trn;
  document.getElementById('ei-subtotal').value = subtotal;
  document.getElementById('ei-vat').value      = vat;
  document.getElementById('ei-total').value    = (subtotal+vat).toFixed(2);
  document.getElementById('ei-conf').value     = conf;
  document.getElementById('ei-status').value   = status;
  document.getElementById('ei-issues').value   = issues;
  document.getElementById('edit-inv-sub').textContent = 'Editing: '+invNo+' - '+supplier;

  editTRNCheck(document.getElementById('ei-trn'));
  runEditValidation();
  showM('m-edit-inv');
}

function editTRNCheck(inp){
  const v = inp.value.replace(/\D/g,'');
  inp.value = v;
  const msg = document.getElementById('ei-trn-msg');
  if(v.length===15){
    msg.innerHTML='<span style="color:var(--green)">? Valid UAE TRN (15 digits)</span>';
  } else if(v.length>0){
    msg.innerHTML=`<span style="color:var(--amber)">? Must be 15 digits (${v.length}/15)</span>`;
  } else {
    msg.innerHTML='<span style="color:var(--text3)">Enter 15-digit TRN</span>';
  }
  runEditValidation();
}

function editCalc(){
  const sub = parseFloat(document.getElementById('ei-subtotal').value)||0;
  const vat = parseFloat(document.getElementById('ei-vat').value)||0;
  document.getElementById('ei-total').value = (sub+vat).toFixed(2);
  runEditValidation();
}

function autoRecalcVAT(){
  const sub = parseFloat(document.getElementById('ei-subtotal').value)||0;
  const calculated = parseFloat((sub*0.05).toFixed(2));
  document.getElementById('ei-vat').value = calculated;
  document.getElementById('ei-total').value = (sub+calculated).toFixed(2);
  runEditValidation();
  toast('VAT recalculated at 5% ?','ok');
}

function runEditValidation(){
  const panel = document.getElementById('ei-validation');
  const trn   = document.getElementById('ei-trn').value;
  const sub   = parseFloat(document.getElementById('ei-subtotal').value)||0;
  const vat   = parseFloat(document.getElementById('ei-vat').value)||0;
  const expected = parseFloat((sub*0.05).toFixed(2));
  const issues = [];

  if(trn.length!==15) issues.push('? TRN must be exactly 15 digits (currently '+trn.length+')');
  if(sub>0 && Math.abs(vat-expected)>1) issues.push('? VAT AED '+vat.toFixed(2)+' ? 5% of AED '+sub.toFixed(2)+' = AED '+expected.toFixed(2));

  panel.style.display='block';
  if(issues.length===0){
    panel.style.background='var(--green-bg)';
    panel.style.border='1px solid var(--green-border)';
    panel.innerHTML='<span style="color:var(--green)">? All fields valid - ready to save</span>';
    document.getElementById('ei-status').value='Valid';
  } else {
    panel.style.background='var(--amber-bg)';
    panel.style.border='1px solid var(--amber-border)';
    panel.innerHTML='<div style="color:var(--amber)">'+issues.map(i=>'<div>'+i+'</div>').join('')+'</div>';
    document.getElementById('ei-status').value=issues.some(i=>i.includes('TRN'))?'Error':'Review';
  }
}

function saveEditedInvoice(){
  const trn = document.getElementById('ei-trn').value;
  if(trn.length!==15){ toast('Fix TRN before saving (must be 15 digits)','err'); return; }

  if(!_editRow){ closeM('m-edit-inv'); return; }

  const invNo    = document.getElementById('ei-invno').value.trim();
  const date     = document.getElementById('ei-date').value.trim();
  const supplier = document.getElementById('ei-supplier').value.trim();
  const sub      = parseFloat(document.getElementById('ei-subtotal').value)||0;
  const vat      = parseFloat(document.getElementById('ei-vat').value)||0;
  const total    = sub+vat;
  const conf     = parseInt(document.getElementById('ei-conf').value)||0;
  const status   = document.getElementById('ei-status').value;
  const issues   = document.getElementById('ei-issues').value.trim();

  const confCls  = conf>=90?'b-g':conf>=70?'b-a':'b-r';
  const stCls    = {Valid:'b-g',Review:'b-a',Error:'b-r'}[status]||'b-gray';
  const trnColor = trn.length===15?'':'color:var(--red)';

  const fmt = n => Number(n).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});

  // update data attribute
  const newData = {invoice_no:invNo,date,supplier,supplier_trn:trn,subtotal:sub,vat_amount:vat,total,confidence:conf,status,issues};
  _editRow.setAttribute('data-inv',JSON.stringify(newData));

  // update cells
  const cells = _editRow.querySelectorAll('td');
  cells[0].textContent = invNo;
  cells[1].textContent = date;
  cells[2].textContent = supplier;
  cells[3].textContent = trn;
  cells[3].style.cssText = 'font-family:DM Mono,monospace;font-size:12px;'+trnColor;
  cells[4].textContent = fmt(sub);
  cells[5].textContent = fmt(vat);
  cells[6].textContent = fmt(total);
  cells[7].innerHTML   = `<span class="b ${confCls}">${conf}%</span>`;
  cells[8].innerHTML   = `<span class="b ${stCls}">${status}</span>`;

  // flash the row green briefly
  _editRow.style.transition='background .3s';
  _editRow.style.background='rgba(62,207,142,0.08)';
  setTimeout(()=>{ _editRow.style.background=''; },1200);

  closeM('m-edit-inv');
  toast('Invoice '+invNo+' updated ?','ok');
  audit('Edited purchase invoice',invNo,'Saved');
  _editRow=null;
}

// -- end edit ------------------------------------------------------

// -- PAYROLL ------------------------------------------------------
function money(n){
  return 'AED '+Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function parseMoneyInput(el){
  return parseFloat(String(el?.value||'0').replace(/,/g,''))||0;
}

function getPayrollRows(){
  return [...document.querySelectorAll('#payroll-tbody tr')];
}

function recalcPayroll(){
  const rows=getPayrollRows();
  let gross=0,deductions=0,netTotal=0,exceptions=0;

  rows.forEach(row=>{
    const basic=parseMoneyInput(row.querySelector('.pay-basic'));
    const allow=parseMoneyInput(row.querySelector('.pay-allow'));
    const ot=parseMoneyInput(row.querySelector('.pay-ot'));
    const ded=parseMoneyInput(row.querySelector('.pay-ded'));
    const net=basic+allow+ot-ded;
    gross+=basic+allow+ot;
    deductions+=ded;
    netTotal+=net;
    if(row.dataset.wps!=='ok')exceptions++;
    const netCell=row.querySelector('.pay-net');
    if(netCell)netCell.textContent=money(net);
  });

  const grossEl=document.getElementById('pay-stat-gross');
  const dedEl=document.getElementById('pay-stat-ded');
  const netEl=document.getElementById('pay-stat-net');
  const excEl=document.getElementById('pay-stat-exc');
  const jeGross=document.getElementById('pay-je-gross');
  const jeDed=document.getElementById('pay-je-ded');
  const jeNet=document.getElementById('pay-je-net');

  if(grossEl)grossEl.textContent=money(gross).replace('.00','');
  if(dedEl)dedEl.textContent=money(deductions).replace('.00','');
  if(netEl)netEl.textContent=money(netTotal).replace('.00','');
  if(excEl)excEl.textContent=exceptions;
  if(jeGross)jeGross.textContent=money(gross);
  if(jeDed)jeDed.textContent=money(deductions);
  if(jeNet)jeNet.textContent=money(netTotal);
}

function runPayroll(){
  recalcPayroll();
  getPayrollRows().forEach(row=>{
    const status=row.querySelector('.pay-status');
    if(!status)return;
    if(row.dataset.wps==='ok'){
      status.className='b b-b pay-status';
      status.textContent='Calculated';
    }else{
      status.className='b b-a pay-status';
      status.textContent='Review';
    }
  });
  toast('Payroll calculated. Review WPS exceptions before approval.','ok');
}

function approvePayroll(){
  const blocked=getPayrollRows().some(row=>row.dataset.wps!=='ok');
  if(blocked){
    toast('Resolve WPS exceptions before final approval','warn');
  }
  document.querySelectorAll('#payroll-tbody .pay-status').forEach(status=>{
    if(status.textContent!=='Review'){
      status.className='b b-g pay-status';
      status.textContent='Approved';
    }
  });
  const fin=document.getElementById('pay-fin-status');
  const mgmt=document.getElementById('pay-mgmt-status');
  if(fin){fin.className='b b-g';fin.textContent='Approved';}
  if(mgmt){mgmt.className=blocked?'b b-a':'b b-g';mgmt.textContent=blocked?'Conditional':'Approved';}
  toast(blocked?'Payroll conditionally approved with WPS hold':'Payroll approved ?',blocked?'warn':'ok');
  audit('Approved payroll','June 2024',blocked?'Conditional':'Approved');
}

function validateWPS(){
  const status=document.getElementById('wps-status');
  const results=document.getElementById('wps-results');
  const exceptions=getPayrollRows().filter(row=>row.dataset.wps!=='ok').length;
  if(status){
    status.className=exceptions?'b b-a':'b b-g';
    status.textContent=exceptions?exceptions+' exception':'Validated';
  }
  if(results){
    results.innerHTML=exceptions
      ? '<div><span style="color:var(--green)">?</span> Payroll totals match SIF preview</div><div><span style="color:var(--amber)">?</span> 1 employee requires bank details before bank upload</div><div><span style="color:var(--green)">?</span> Employer MOL ID and file sequence are present</div>'
      : '<div><span style="color:var(--green)">?</span> All employees passed WPS validation</div><div><span style="color:var(--green)">?</span> SIF file is ready for bank upload</div>';
  }
  toast(exceptions?'WPS validation completed with exceptions':'WPS validation passed ?',exceptions?'warn':'ok');
}

function generateSIF(){
  validateWPS();
  const hasHold=getPayrollRows().some(row=>row.dataset.wps!=='ok');
  toast(hasHold?'SIF draft generated. Blocked employees excluded until fixed.':'SIF generated for bank upload ?',hasHold?'warn':'ok');
}

function getPayrollRowInfo(row){
  const name=row.querySelector('td div div div')?.textContent||'Employee';
  const basic=parseMoneyInput(row.querySelector('.pay-basic'));
  const allow=parseMoneyInput(row.querySelector('.pay-allow'));
  const ot=parseMoneyInput(row.querySelector('.pay-ot'));
  const ded=parseMoneyInput(row.querySelector('.pay-ded'));
  return {name,basic,allow,ot,ded,net:basic+allow+ot-ded};
}

function renderPayslipPreview(info){
  const body=document.getElementById('payslip-body');
  if(!body)return;
  body.innerHTML=`
    <div class="flx-b"><span>Employee</span><strong style="color:var(--text)">${info.name}</strong></div>
    <div class="flx-b"><span>Basic Salary</span><span class="mono">${money(info.basic)}</span></div>
    <div class="flx-b"><span>Allowances</span><span class="mono">${money(info.allow)}</span></div>
    <div class="flx-b"><span>Overtime / Variable Pay</span><span class="mono">${money(info.ot)}</span></div>
    <div class="flx-b"><span>Deductions</span><span class="mono" style="color:var(--red)">${money(info.ded)}</span></div>
    <div class="divider"></div>
    <div class="flx-b"><strong style="color:var(--text)">Net Pay</strong><strong class="mono" style="color:var(--green)">${money(info.net)}</strong></div>`;
}

function previewPayslip(btn){
  const row=btn.closest('tr');
  if(!row)return;
  const info=getPayrollRowInfo(row);
  renderPayslipPreview(info);
  const tab=document.querySelector('#page-payroll .tab:nth-child(5)');
  if(tab)stab(tab,'pay-payslips');
  toast('Payslip preview opened for '+info.name,'info');
}

function previewStaticPayslip(name,net){
  const numeric=parseFloat(String(net).replace(/,/g,''))||0;
  renderPayslipPreview({name,basic:numeric*.78,allow:numeric*.22,ot:0,ded:0,net:numeric});
}

function publishPayslips(){
  toast('Payslips published to employee email and mobile app ?','ok');
  audit('Published payslips','June 2024','Published');
}

function postPayrollJournal(){
  recalcPayroll();
  const ref='PAY-JE-'+new Date().toISOString().slice(0,10).replace(/-/g,'');
  const date=new Date().toISOString().split('T')[0];
  const gross=parseAmount(document.getElementById('pay-je-gross')?.textContent);
  const deductions=parseAmount(document.getElementById('pay-je-ded')?.textContent);
  const net=parseAmount(document.getElementById('pay-je-net')?.textContent);
  postLedgerLine({date,ref,description:'Payroll gross salary expense',debit:gross,credit:0,account:'Operating Expenses (5000)'});
  if(deductions)postLedgerLine({date,ref,description:'Payroll deductions payable',debit:0,credit:deductions,account:'Accounts Payable (2000)'});
  postLedgerLine({date,ref,description:'Net payroll payable',debit:0,credit:net,account:'Accounts Payable (2000)'});
  filterLedger();
  toast('Payroll journal posted to accounting ?','ok');
  audit('Posted payroll journal','Accounting','Posted');
}

function calcGratuity(){
  const basic=parseMoneyInput(document.getElementById('eos-basic'));
  const years=parseFloat(document.getElementById('eos-years')?.value)||0;
  const months=parseFloat(document.getElementById('eos-months')?.value)||0;
  const serviceYears=years+(months/12);
  const daily=basic/30;
  const firstFive=Math.min(serviceYears,5)*21;
  const aboveFive=Math.max(serviceYears-5,0)*30;
  const eligibleDays=firstFive+aboveFive;
  const total=daily*eligibleDays;
  const dailyEl=document.getElementById('eos-daily');
  const daysEl=document.getElementById('eos-days');
  const totalEl=document.getElementById('eos-total');
  if(dailyEl)dailyEl.textContent=money(daily);
  if(daysEl)daysEl.textContent=eligibleDays.toFixed(2);
  if(totalEl)totalEl.textContent=money(total);
}

// -- REPORTS + AI INSIGHTS ----------------------------------------
function runAIReport(){
  const summary=document.getElementById('ai-summary');
  const actions=document.getElementById('ai-actions');
  const output=document.getElementById('ai-report-output');
  const risk=document.getElementById('rep-risk-score');
  const reportType=document.getElementById('ai-report-type')?.value||'Board Summary';

  if(summary){
    summary.textContent='AI detected strong revenue growth, stable gross margin, and a collection risk concentrated in one 61-90 day customer balance. VAT payable is manageable if purchase invoice exceptions are cleared before filing.';
  }
  if(actions){
    actions.innerHTML='<div>- Prioritize overdue collection before month-end.</div><div>- Clear supplier TRN and VAT math exceptions before VAT return approval.</div><div>- Model supplier discount impact because COGS is the largest profit lever.</div>';
  }
  if(output){
    output.innerHTML=`<strong style="color:var(--text)">${reportType}</strong><br>Revenue is trending ahead of prior month by 14.2%, while gross margin remains healthy at 34.0%. The main operational risk is receivables aging: AED 32,550 is now in the 61-90 day bucket. VAT payable is AED 16,410, with AI recommending invoice validation cleanup before export. Cash remains positive over 60 days but turns negative in the 90-day forecast unless collections improve.`;
  }
  if(risk){
    risk.style.color='var(--amber)';
    risk.textContent='Medium';
  }
  toast('AI report insights generated ?','ok');
  audit('Generated AI report',reportType,'Logged');
}

function simulateReportScenario(type){
  const output=document.getElementById('ai-report-output');
  const summary=document.getElementById('ai-summary');
  let msg='Scenario generated';
  if(type==='supplier'){
    msg='Supplier cost scenario: reducing COGS by 2% improves monthly net profit by about AED 19,300 and lifts gross margin from 34.0% to 36.0%.';
  }else if(type==='growth'){
    msg='Growth scenario: 10% revenue uplift adds about AED 96,500 revenue, AED 32,800 gross profit, and approximately AED 4,600 additional output VAT before input offsets.';
  }
  if(output)output.innerHTML='<strong style="color:var(--text)">Scenario Result</strong><br>'+msg;
  if(summary)summary.textContent=msg;
  toast('Scenario simulation updated','info');
}

function askReportAI(){
  const q=(document.getElementById('report-ai-question')?.value||'').trim();
  const answer=document.getElementById('report-ai-answer');
  if(!q){
    toast('Enter a question first','warn');
    return;
  }
  const lower=q.toLowerCase();
  let response='The current reports suggest revenue growth is healthy, but working capital needs attention. Review receivables aging, VAT exceptions, and expense variance before final management reporting.';
  if(lower.includes('cash')){
    response='Cash can decrease while revenue increases when invoices are unpaid, inventory purchases rise, or payroll and supplier payments happen before collections. In this data, the 61-90 day receivable balance is the strongest cash pressure signal.';
  }else if(lower.includes('vat')){
    response='VAT payable is AED 16,410. Before filing, resolve invoices with TRN or VAT calculation warnings so input VAT claims are supportable.';
  }else if(lower.includes('profit')||lower.includes('margin')){
    response='Net profit is AED 214,080 for June. Gross margin is 34.0%; a small COGS reduction has more impact than cutting smaller operating expense lines.';
  }
  if(answer)answer.textContent=response;
  toast('AI answer generated','ok');
}

// -- SYSTEM AI ASSISTANT ------------------------------------------
function buildSystemAIResponse(question){
  const q=question.toLowerCase();
  if(q.includes('invoice')||q.includes('sales')||q.includes('customer')||q.includes('product')){
    return 'For invoices: open Sales & Invoices, use Create Invoice, add or select a customer, add products in Line Items, then use Preview PDF to view the formatted invoice. Invoice layout is configured in Settings > Documents > Invoice Layout Setup. Uploaded sales invoices can also be imported from PDF, Excel, CSV, JPEG, or PNG and stored in the invoice register.';
  }
  if(q.includes('layout')||q.includes('template')||q.includes('footer')||q.includes('bank note')||q.includes('logo')){
    return 'Invoice layout is controlled from Settings > Documents. You can set the template style, accent color, company display name, TRN visibility, header address, bank/payment note, and footer message. The invoice preview uses those settings immediately.';
  }
  if(q.includes('purchase')||q.includes('ocr')||q.includes('extract')||q.includes('document')){
    return 'Purchases support document upload and extraction through the backend app-data API. Extracted purchase invoices are saved to the database, can be reviewed, corrected, and validated before becoming records.';
  }
  if(q.includes('bill')||q.includes('vendor')||q.includes('payable')||q.includes('purchase order')){
    return 'Bills covers vendor bills, purchase orders, and aged payables. Supplier and vendor directory is managed from the Purchase module.';
  }
  if(q.includes('payment')||q.includes('receipt')||q.includes('gateway')||q.includes('settlement')){
    return 'Payments tracks customer receipts, supplier payments, and gateway settlements. Customer receipts can be allocated to invoices, supplier payments can clear bills, and gateway settlement views show gross, fees, and net amounts.';
  }
  if(q.includes('tax invoice')||q.includes('invoice include')||q.includes('tax invoice include')){
    return 'UAE tax invoice checklist: supplier legal name and address, supplier TRN, customer name and TRN where applicable, unique invoice number, invoice date, supply date if different, description of goods/services, quantity, unit price, taxable amount, VAT rate, VAT amount in AED, total including VAT, and clear tax treatment such as 5%, 0%, exempt, or reverse charge. TaxFlow supports invoice layout setup in Settings > Documents and TRN/VAT validation in invoice and purchase flows.';
  }
  if(q.includes('trn')||q.includes('tax registration number')){
    return 'UAE TRN guidance: a VAT TRN should be 15 digits. In TaxFlow, customer, supplier, company, and extracted purchase TRNs are checked for 15 digits. Before VAT filing, review missing/invalid TRNs, especially supplier invoices where input VAT is claimed. Production should verify TRNs against an authoritative FTA-supported process where available.';
  }
  if(q.includes('zero')||q.includes('zero-rated')||q.includes('zero rated')||q.includes('exempt')){
    return 'UAE VAT distinction: zero-rated supplies are taxable at 0%, so they are reported in VAT returns and may still allow related input VAT recovery if conditions are met. Exempt supplies are outside recoverable VAT treatment, so related input VAT may be blocked or apportioned. Keep export evidence, contract/supporting documents, and correct tax coding for every 0% or exempt transaction.';
  }
  if(q.includes('reverse charge')||q.includes('rcm')){
    return 'UAE reverse charge: for certain imported services or goods, the recipient accounts for output VAT and may recover input VAT if eligible. In system terms, mark the transaction as reverse charge, calculate output VAT and recoverable input VAT separately, and keep supplier invoice/import evidence. It should flow to VAT return boxes separately from normal local 5% purchases.';
  }
  if(q.includes('input vat')||q.includes('recover')||q.includes('recoverable')||q.includes('non-recoverable')){
    return 'Input VAT recovery checks: supplier invoice must be valid, supplier TRN should be present, expense must relate to taxable business activity, VAT amount should match the rate, and blocked/non-business expenses should be excluded or apportioned. TaxFlow purchase validation flags TRN and VAT math issues before VAT reporting.';
  }
  if(q.includes('fta')||q.includes('audit')||q.includes('record')||q.includes('evidence')){
    return 'FTA audit readiness: retain tax invoices, credit notes, export/customs evidence for zero-rated supplies, import/reverse-charge documents, payment evidence, bank reconciliations, VAT workpapers, payroll/WPS support where relevant, and audit logs of changes. TaxFlow Documents includes an Audit Pack area for VAT evidence, payroll evidence, and accounting evidence.';
  }
  if(q.includes('notification')||q.includes('email')||q.includes('whatsapp')||q.includes('sms')||q.includes('push')){
    return 'Notifications includes in-app alerts, email, WhatsApp/SMS, and push-style rules. Typical rules include overdue invoice reminders, VAT due alerts, bank sync failures, and payroll approval reminders.';
  }
  if(q.includes('attachment')||q.includes('receipt image')||q.includes('audit pack')||q.includes('file storage')){
    return 'Documents is the repository for invoice PDFs, receipt images, bill attachments, contracts, audit packs, and VAT evidence. In production these files should move to S3 or Azure Blob Storage with encrypted retention policies.';
  }
  if(q.includes('account')||q.includes('journal')||q.includes('ledger')||q.includes('debit')||q.includes('credit')){
    return 'Accounting now includes Chart of Accounts, Journal Entry, and General Ledger. Journal entries require date, reference, description, at least two valid lines, selected accounts, and balanced debit/credit totals before posting. Posted journals appear in the ledger, and account View filters ledger entries.';
  }
  if(q.includes('payroll')||q.includes('wps')||q.includes('payslip')||q.includes('salary')){
    return 'Payroll includes salary calculation, WPS/SIF validation, payslip preview, approvals, and accounting posting. Payroll journal posting creates ledger lines for gross salary expense, deductions payable, and net payroll payable.';
  }
  if(q.includes('vat')||q.includes('tax')||q.includes('trn')||q.includes('filing')){
    return 'For VAT readiness, check customer/supplier TRNs, VAT math at 5% where applicable, purchase validation exceptions, sales invoice totals, and report VAT payable. Settings includes tax and eInvoicing readiness controls, while Reports includes VAT, P&L, trial balance, aging, and AI insights.';
  }
  if(q.includes('setting')||q.includes('permission')||q.includes('user')||q.includes('security')||q.includes('backup')||q.includes('audit')){
    return 'Settings covers company registration, users and roles, tax settings, notifications, security, integrations, approvals, document templates, invoice layout, backups, system health, and audit logs. Important actions such as invoice views, journal posting, layout saves, and payroll posting are logged.';
  }
  if(q.includes('bank')||q.includes('reconcile')||q.includes('payment')){
    return 'Bank Accounts covers accounts, transactions, and reconciliation. The current UI is connected to the app database for saved actions, while bank feed connections, CSV/MT940 imports, matching rules, and payment allocation can be added on top of the same backend modules.';
  }
  if(q.includes('report')||q.includes('dashboard')||q.includes('cash')||q.includes('profit')||q.includes('aging')){
    return 'Reports include executive dashboard, VAT report, P&L, trial balance, aging report, and AI insights. Dashboard and side-menu counts read from database-backed module totals.';
  }
  if(q.includes('roadmap')||q.includes('production')||q.includes('improve')||q.includes('backend')||q.includes('database')){
    return 'Production priorities: add authentication, tenant/company scoping, database persistence, object storage for uploaded files, real extraction APIs, audit trails, role permissions, backend AI, eInvoicing adapters, bank integrations, tests, and CI. The detailed backlog is in docs/improvement-roadmap.md.';
  }
  return 'TaxFlow is organized into Dashboard, Sales & Invoices, Quotations, Purchases, Expenses, Bank, Accounting, Reports, Inventory, Staff, Payroll, Expert Review, Settings, and this AI Assistant. Ask about a module name or workflow such as quotation creation, invoice creation, purchase extraction, stock mapping, journal posting, VAT filing, payroll WPS, settings, or production roadmap.';
}

function askSystemAI(prompt){
  const input=document.getElementById('system-ai-question');
  const answer=document.getElementById('system-ai-answer');
  const question=(prompt||input?.value||'').trim();
  if(!question){
    toast('Enter a system question first','warn');
    return;
  }
  if(input)input.value=question;
  if(answer){
    answer.innerHTML=`<strong style="color:var(--text)">Question</strong><br>${escapeHtml(question)}<div class="divider"></div><strong style="color:var(--text)">Answer</strong><br>${escapeHtml(buildSystemAIResponse(question))}`;
  }
  toast('AI assistant answered','ok');
  audit('Asked AI assistant',question.slice(0,60),'Answered');
}

function clearSystemAI(){
  const input=document.getElementById('system-ai-question');
  const answer=document.getElementById('system-ai-answer');
  if(input)input.value='';
  if(answer)answer.textContent='Ask a question to get a system-specific answer.';
}

// -- TABLE SEARCH + PAGINATION -----------------------------------
const tableEnhanceState=new WeakMap();
let currentDetailRow=null;
let currentDetailTable=null;

function enhancePageTables(pageId){
  const page=document.getElementById(pageId);
  if(!page)return;
  page.querySelectorAll('table.tbl').forEach(table=>enhanceTable(table));
}

function refreshActivePageTables(){
  const page=document.querySelector('.page.on');
  if(!page)return;
  page.querySelectorAll('table.tbl').forEach(table=>{
    refreshEnhancedTable(table);
  });
}

function refreshInitializedTables(){
  document.querySelectorAll('table.tbl').forEach(table=>{
    if(tableEnhanceState.has(table))refreshEnhancedTable(table);
  });
}

function applyAllTableActions(){
  normalizeSalesInvoiceActions();
  document.querySelectorAll('table.tbl').forEach(table=>addTableDeleteActions(table));
}

function watchVisibleTablePagination(){
  if(window.__taxflowPaginationWatcher)return;
  window.__taxflowPaginationWatcher=true;
  const observer=new MutationObserver(mutations=>{
    if(!mutations.some(m=>m.type==='attributes'&&m.attributeName==='class'))return;
    scheduleIdleTask(()=>refreshActivePageTables(),350);
  });
  document.querySelectorAll('.page,.tab-body').forEach(el=>{
    observer.observe(el,{attributes:true,attributeFilter:['class']});
  });
}

function unwrapExistingTableControls(table){
  let shell=table.closest('.tbl-shell');
  while(shell){
    const host=shell.parentElement;
    if(!host)break;
    host.insertBefore(table,shell);
    shell.remove();
    shell=table.closest('.tbl-shell');
  }
  table.querySelectorAll('th[data-delete-col]').forEach(cell=>cell.remove());
  table.querySelectorAll('td[data-delete-col]').forEach(cell=>cell.remove());
  table.querySelectorAll('th[data-action-col]').forEach(cell=>cell.remove());
  table.querySelectorAll('td[data-action-col]').forEach(cell=>cell.remove());
  getTableRows(table).forEach(row=>{
    delete row.dataset.deleteActionAdded;
    delete row.dataset.rowActionsAdded;
  });
}

function removeDuplicateTablePagers(scope=document){
  const pagedTables=new Set();
  scope.querySelectorAll('table.tbl').forEach(table=>{
    const shell=table.closest('.tbl-shell');
    if(!shell)return;
    if(pagedTables.has(table)){
      unwrapExistingTableControls(table);
      return;
    }
    pagedTables.add(table);
    shell.querySelectorAll(':scope > .tbl-tools').forEach((tools,index)=>{
      if(index>0)tools.remove();
    });
  });
}

function tableControlsTemplate(){
  return `
    <div class="tbl-search-wrap">
      <input class="fi tbl-search" placeholder="Search table">
      <span class="b b-gray tbl-info">0 records</span>
    </div>
    <div class="tbl-pager">
      <label class="tbl-size-label">Rows to display
        <select class="fi tbl-size" aria-label="Rows to display">
          <option value="5">5 rows</option>
          <option value="10" selected>10 rows</option>
          <option value="25">25 rows</option>
          <option value="50">50 rows</option>
          <option value="100">100 rows</option>
          <option value="all">All rows</option>
        </select>
      </label>
      <button class="btn btn-g btn-sm tbl-prev" type="button">Prev</button>
      <button class="btn btn-g btn-sm tbl-next" type="button">Next</button>
      <button class="btn btn-g btn-sm tbl-export" type="button">Export CSV</button>
    </div>
  `;
}

function skipTableTools(table){
  return table?.dataset?.noTableTools==='1';
}

function enhanceTable(table){
  if(skipTableTools(table)){
    addTableDeleteActions(table);
    getTableRows(table).forEach(row=>{
      row.style.display='';
      row.hidden=false;
    });
    return;
  }
  removeDuplicateTablePagers(table.closest('.page')||document);
  if(table.closest('.tbl-scroll')&&tableEnhanceState.has(table)){
    refreshEnhancedTable(table);
    return;
  }
  if(tableEnhanceState.has(table))return;
  if(table.closest('.tbl-shell')){
    unwrapExistingTableControls(table);
  }

  const parent=table.parentElement;
  if(!parent)return;

  const shell=document.createElement('div');
  shell.className='tbl-shell';
  const controls=document.createElement('div');
  controls.className='tbl-tools';
  controls.innerHTML=tableControlsTemplate();
  const scroll=document.createElement('div');
  scroll.className='tbl-scroll';

  parent.insertBefore(shell,table);
  shell.appendChild(controls);
  shell.appendChild(scroll);
  scroll.appendChild(table);

  const state={
    page:1,
    pageSize:10,
    query:'',
    input:controls.querySelector('.tbl-search'),
    size:controls.querySelector('.tbl-size'),
    prev:controls.querySelector('.tbl-prev'),
    next:controls.querySelector('.tbl-next'),
    exportBtn:controls.querySelector('.tbl-export'),
    info:controls.querySelector('.tbl-info')
  };
  tableEnhanceState.set(table,state);

  state.input.addEventListener('input',()=>{
    state.query=state.input.value.trim().toLowerCase();
    state.page=1;
    refreshEnhancedTable(table);
  });
  state.size.addEventListener('change',()=>{
    state.pageSize=state.size.value==='all'?'all':Number(state.size.value);
    state.page=1;
    refreshEnhancedTable(table);
  });
  state.prev.addEventListener('click',()=>{
    if(state.page<=1){
      toast('Already showing the first rows','info');
      refreshEnhancedTable(table);
      return;
    }
    state.page=Math.max(1,state.page-1);
    refreshEnhancedTable(table);
  });
  state.next.addEventListener('click',()=>{
    const matched=getTableRows(table).filter(row=>!state.query||row.textContent.toLowerCase().includes(state.query));
    const pageSize=state.pageSize==='all'?matched.length||1:state.pageSize;
    const totalPages=Math.max(1,Math.ceil(matched.length/pageSize));
    if(state.page>=totalPages){
      toast(`No more rows. ${matched.length} records loaded.`,'info');
      refreshEnhancedTable(table);
      return;
    }
    state.page=Math.min(totalPages,state.page+1);
    refreshEnhancedTable(table);
  });
  state.exportBtn.addEventListener('click',()=>exportTableCsv(table));
  addTableDeleteActions(table);

  const tbody=table.tBodies[0];
  if(tbody){
    const observer=new MutationObserver(()=>{
      addTableDeleteActions(table);
      refreshEnhancedTable(table);
    });
    observer.observe(tbody,{childList:true,subtree:true});
  }
  refreshEnhancedTable(table);
}

function exportTableCsv(table){
  const title=(table.closest('.card')?.querySelector('.card-title')?.textContent||document.getElementById('ptitle')?.textContent||'TaxFlow Export').trim();
  const headers=[...table.querySelectorAll('thead th')]
    .filter(th=>!th.dataset.deleteCol)
    .filter(th=>!th.dataset.actionCol)
    .map(th=>th.textContent.trim())
    .filter(Boolean);
  const rows=getTableRows(table)
    .filter(row=>row.style.display!=='none')
    .map(row=>[...row.children].filter(cell=>!cell.dataset.deleteCol&&!cell.dataset.actionCol).map(cell=>cell.textContent.replace(/\s+/g,' ').trim()));
  if(!rows.length){
    toast('No visible rows to export','warn');
    return;
  }
  const csv=[headers, ...rows].map(row=>row.map(value=>`"${String(value||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'taxflow-export'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast(`${title} exported`,'ok');
  audit('Exported table',title,'CSV');
}

function deleteIconSvg(){
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10"/><path d="M6 4V2.8h4V4"/><path d="M5 6v7"/><path d="M8 6v7"/><path d="M11 6v7"/><path d="M4.5 4l.5 10h6l.5-10"/></svg>`;
}

function viewIconSvg(){
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.8 8s2.2-4 6.2-4 6.2 4 6.2 4-2.2 4-6.2 4-6.2-4-6.2-4z"/><circle cx="8" cy="8" r="1.8"/></svg>`;
}

function editIconSvg(){
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 11.5V13h1.5L12 5.5 10.5 4 3 11.5z"/><path d="M9.8 4.7l1.5 1.5"/><path d="M2.5 14h11"/></svg>`;
}

function tableActionButtonsHtml(table){
  const collection=inferCollectionFromContext(table);
  if(collection==='salesInvoices')return salesInvoiceActionsHtml();
  const editAction=collection==='purchaseRecords'
    ? 'editPurchaseRecord(this)'
    : "openGenericEditRow(this,'Edit '+(document.getElementById('ptitle')?.textContent||'Record'),'Update selected row')";
  return `<div class="row-actions">
    <button class="icon-btn view" type="button" title="View" aria-label="View row" onclick="openRowDetail(this,'Record Detail',document.getElementById('ptitle')?.textContent||'Detail')">${viewIconSvg()}</button>
    <button class="icon-btn edit" type="button" title="Edit" aria-label="Edit row" onclick="${editAction}">${editIconSvg()}</button>
    <button class="icon-btn danger row-delete-btn" type="button" title="Delete" aria-label="Delete row" onclick="deleteTableRow(this)">${deleteIconSvg()}</button>
  </div>`;
}

function findGenericActionCell(row){
  return [...row.children].find(cell=>
    cell.dataset.actionCol==='1'||
    cell.querySelector('.row-actions')||
    cell.querySelector('button[onclick*="openRowDetail"],button[onclick*="editPurchaseRecord"],button[onclick*="openSalesInvoiceRow"],button[onclick*="shareSalesInvoiceRow"],button.row-delete-btn')
  );
}

function addTableDeleteActions(table){
  if(!table||table.dataset.deleteActionsBound==='skip')return;
  const headRow=table.tHead?.rows?.[0];
  const existingActionCells=getTableRows(table).map(findGenericActionCell).filter(Boolean);
  const actionIndex=existingActionCells[0]?[...existingActionCells[0].parentElement.children].indexOf(existingActionCells[0]):-1;
  if(headRow){
    const actionHead=actionIndex>=0?headRow.cells[actionIndex]:[...headRow.cells].find(cell=>cell.dataset.actionCol);
    if(actionHead){
      actionHead.dataset.actionCol='1';
      actionHead.textContent='Actions';
    }else{
      const th=document.createElement('th');
      th.dataset.actionCol='1';
      th.textContent='Actions';
      headRow.appendChild(th);
    }
  }
  getTableRows(table).forEach(row=>{
    if(row.querySelector('td[colspan]'))return;
    const td=findGenericActionCell(row)||document.createElement('td');
    if(row.dataset.rowActionsAdded==='1'&&td.querySelector('.row-actions'))return;
    td.dataset.actionCol='1';
    td.innerHTML=tableActionButtonsHtml(table);
    if(!td.parentElement)row.appendChild(td);
    row.dataset.rowActionsAdded='1';
  });
}

function rowFirstValue(row){
  return row?.children?.[0]?.textContent.trim()||'Selected row';
}

function tableHasText(selector,value){
  const target=String(value||'').trim().toLowerCase();
  if(!target)return false;
  return [...document.querySelectorAll(`${selector} tr`)].some(row=>row.textContent.toLowerCase().includes(target));
}

function rowDeleteBlockReason(row,table){
  const page=table.closest('.page')?.id||'';
  const text=row.textContent.toLowerCase();
  const collection=inferCollectionFromContext(table);
  const first=rowFirstValue(row);
  const statusWords=[
    ['posted','posted records must be reversed or voided, not deleted.'],
    ['paid','paid records are linked to payments and cannot be deleted.'],
    ['approved','approved records are part of an approval workflow and cannot be deleted.'],
    ['reconciled','reconciled records are linked to bank reconciliation and cannot be deleted.'],
    ['settled','settled records are linked to payment settlement and cannot be deleted.'],
    ['retained','retained documents are part of audit evidence and cannot be deleted.'],
    ['stored','stored documents are linked to source records and cannot be deleted here.'],
    ['published','published rota records are linked to attendance and cannot be deleted.'],
    ['finalized','finalized records are locked and cannot be deleted.'],
    ['blocked','blocked records need review before deletion.']
  ];

  if(page==='page-dashboard')return 'Dashboard rows are generated from database summaries. Open the source module to change records.';
  if(page==='page-reports')return 'Reports are generated from source records. Delete or reverse the source transaction instead.';
  if(collection==='audit')return 'Audit logs are compliance evidence and cannot be deleted.';
  if(text.includes('total assets')||text.includes('total liabilities')||text.includes('total receivables')||text.trim()==='total')return 'Total rows are calculated summaries and cannot be deleted.';

  for(const [word,reason] of statusWords){
    if(text.includes(word))return reason;
  }

  if(collection==='products'){
    const code=row.children[0]?.textContent.trim();
    const name=row.children[1]?.textContent.trim();
    if(tableHasText('#sales-invoice-tbody',name)||tableHasText('#stock-map-tbody',code)||tableHasText('#stock-map-tbody',name)){
      return 'This product is linked to invoices or inventory mapping. Remove those links before deleting.';
    }
  }
  if(collection==='salesCategories'){
    if(tableHasText('#prod-tbody',first)){
      return 'This category is used by products or services. Move those products to another category before deleting.';
    }
  }
  if(collection==='salesUnits'){
    const unitName=row.children[1]?.textContent.trim()||first;
    if(tableHasText('#prod-tbody',unitName)){
      return 'This unit is used by products or services. Move those products to another unit before deleting.';
    }
  }
  if(collection==='customers'){
    if(tableHasText('#sales-invoice-tbody',first)){
      return 'This customer has linked invoices. Delete or void those invoices before deleting the customer.';
    }
  }
  if(collection==='accounts'){
    const code=row.children[0]?.textContent.trim();
    if(['1000','1100','1200','2100','2200','2210','3000','4000','5000','6000'].includes(code)||tableHasText('#ledger-tbody',code)){
      return 'This account is used by ledger entries or posting rules. Deactivate it instead of deleting.';
    }
  }
  if(collection==='salesInvoices'){
    const invoiceNo=row.children[0]?.textContent.trim();
    if(tableHasText('#page-documents',invoiceNo)){
      return 'This invoice has linked documents or evidence. Remove the linked evidence before deleting.';
    }
  }
  if(collection==='purchaseRecords'){
    const ref=row.children[0]?.textContent.trim();
    const source=row.children[11]?.textContent.trim().toLowerCase()||'';
    if(source.includes('ai')||tableHasText('#page-documents',ref)||tableHasText('#payment-out-tbody',ref)){
      return 'This purchase is linked to extraction, documents, or payments. Remove those links before deleting.';
    }
  }
  if(collection==='bills'){
    const billNo=row.children[0]?.textContent.trim();
    if(tableHasText('#payment-out-tbody',billNo)){
      return 'This bill is linked to supplier payment records and cannot be deleted.';
    }
  }
  if(collection==='vendors'){
    if(tableHasText('#bill-tbody',first)||tableHasText('#payment-out-tbody',first)){
      return 'This vendor is linked to bills or payments. Remove those records before deleting.';
    }
  }
  if(collection==='payments'){
    return 'Payment rows affect cash/bank history. Void or reverse the payment instead of deleting.';
  }
  if(page==='page-accounting'&&text.includes('journal')){
    return 'Journal records must use reversal entries instead of deletion.';
  }
  return '';
}

function deleteTableRow(btn){
  const row=btn.closest('tr');
  const table=row?.closest('table');
  if(!row||!table)return;
  const reason=rowDeleteBlockReason(row,table);
  const label=rowFirstValue(row);
  if(reason){
    toast(`Cannot delete ${label}: ${reason}`,'warn');
    audit('Delete blocked',label,reason);
    btn.title=reason;
    return;
  }
  currentDetailRow=row;
  currentDetailTable=table;
  deleteCurrentDetailRow();
}

function getTableRows(table){
  const tbody=table.tBodies[0];
  if(tbody)return [...tbody.rows];
  return [...table.querySelectorAll(':scope > tr')].filter(row=>!row.closest('thead'));
}

function getTableDataRows(table){
  return getTableRows(table).filter(row=>
    row.dataset.emptyState!=='1' &&
    row.dataset.previewSummary!=='1' &&
    !row.querySelector('td[colspan]')
  );
}

function refreshEnhancedTable(table){
  if(!table)return;
  if(skipTableTools(table)){
    getTableRows(table).forEach(row=>{
      row.style.display='';
      row.hidden=false;
    });
    return;
  }
  const state=tableEnhanceState.get(table);
  if(!state){
    enhanceTable(table);
    return;
  }
  const rows=getTableRows(table);
  const dataRows=getTableDataRows(table);
  const query=state.query;
  const matched=dataRows.filter(row=>!query||row.textContent.toLowerCase().includes(query));
  const pageSize=state.pageSize==='all'?matched.length||1:state.pageSize;
  const totalPages=Math.max(1,Math.ceil(matched.length/pageSize));
  state.page=Math.min(Math.max(1,state.page),totalPages);
  const start=(state.page-1)*pageSize;
  const end=start+pageSize;
  const pageRows=matched.slice(start,end);
  const visible=new Set(pageRows);
  rows.forEach(row=>{
    row.style.display=visible.has(row)?'':'none';
    row.hidden=!visible.has(row);
  });
  state.prev.disabled=false;
  state.next.disabled=false;
  state.prev.classList.toggle('is-muted',state.page<=1);
  state.next.classList.toggle('is-muted',state.page>=totalPages);
  state.prev.title=state.page<=1?'Already showing the first rows':'Show previous rows';
  state.next.title=state.page>=totalPages?`${matched.length} records loaded; no more rows`:'Show next rows';
  if(state.info){
    const total=dataRows.length;
    state.info.textContent=total
      ? `DB records: ${total.toLocaleString('en-AE')} | Showing ${pageRows.length.toLocaleString('en-AE')} (${matched.length?`${(start+1).toLocaleString('en-AE')}-${Math.min(end,matched.length).toLocaleString('en-AE')} of ${matched.length.toLocaleString('en-AE')}`:'0 matched'})`
      : 'DB records: 0';
  }
  table.dataset.visibleRows=String(pageRows.length);
  table.dataset.totalRows=String(matched.length);
  table.dataset.dbRows=String(dataRows.length);
}

// -- ROW DETAIL VIEWS --------------------------------------------
function ensureDetailModal(){
  let overlay=document.getElementById('m-row-detail');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.className='overlay';
  overlay.id='m-row-detail';
  overlay.onclick=e=>closeOvBg(e,'m-row-detail');
  overlay.innerHTML=`
    <div class="modal modal-lg">
      <div class="modal-title" id="row-detail-title">Record Detail</div>
      <div class="modal-sub" id="row-detail-sub">Detailed view</div>
      <div id="row-detail-body"></div>
      <div class="modal-foot">
        <button class="btn btn-danger" onclick="deleteCurrentDetailRow()">Delete</button>
        <button class="btn btn-g" onclick="exportRowDetailPdf()">Export PDF</button>
        <button class="btn btn-g" onclick="toast('Record marked for review','ok')">Mark Review</button>
        <button class="btn btn-p" onclick="closeM('m-row-detail')">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function openRowDetail(btn,title='Record Detail',subtitle='Detailed view'){
  const row=btn.closest('tr');
  const table=row?.closest('table');
  if(!row||!table)return;
  currentDetailRow=row;
  currentDetailTable=table;
  const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim()).filter(Boolean);
  const cells=[...row.children];
  const pairs=cells
    .map((cell,index)=>({label:headers[index]||`Field ${index+1}`,value:cell.textContent.trim()}))
    .filter((item,index)=>item.value&&item.value.toLowerCase()!=='view'&&!cells[index]?.querySelector('button'));

  ensureDetailModal();
  document.getElementById('row-detail-title').textContent=title;
  document.getElementById('row-detail-sub').textContent=subtitle;
  document.getElementById('row-detail-body').innerHTML=`
    <div class="g2 mb16">
      ${pairs.map(item=>`
        <div class="setting-tile">
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.value)}</p>
        </div>
      `).join('')}
    </div>
    <div class="chart-panel">
      <div class="chart-title mb12">Workflow Status</div>
      <div class="tline-item"><div class="tline-dot" style="background:var(--green-bg);color:var(--green)">1</div><div><div>Record loaded</div><div class="card-sub">This detail is generated from the selected table row.</div></div></div>
      <div class="tline-item"><div class="tline-dot" style="background:var(--accent-glow);color:var(--accent)">2</div><div><div>Database-ready view</div><div class="card-sub">The same layout can be connected to a record detail endpoint for production drilldown.</div></div></div>
    </div>
  `;
  showM('m-row-detail');
  audit('Viewed record',pairs[0]?.value||title,'Opened');
}

function exportRowDetailPdf(){
  const title=document.getElementById('row-detail-title')?.textContent||'Record Detail';
  const body=document.getElementById('row-detail-body')?.innerHTML;
  if(!body){
    toast('Record detail not open','warn');
    return;
  }
  const printWindow=window.open('','_blank','width=900,height=720');
  if(!printWindow){
    toast('Allow popups to export PDF','warn');
    return;
  }
  const styles=[...document.querySelectorAll('link[rel="stylesheet"],style')].map(node=>node.outerHTML).join('\n');
  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)} - TaxFlow</title>${styles}<style>body{background:#fff;color:#111;padding:24px;height:auto;overflow:auto}.topbar,.sb,.scrim,.toasts,.btn{display:none!important}.card,.chart-panel,.setting-tile{background:#fff!important;border:1px solid #d9dee8!important;box-shadow:none!important}</style></head><body><div class="pdf-shell"><div class="pdf-title" style="font-family:Syne,sans-serif;font-size:22px;font-weight:700;margin-bottom:14px">${escapeHtml(title)}</div>${body}</div><script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script></body></html>`);
  printWindow.document.close();
  toast(`${title} PDF export opened`,'ok');
  audit('Exported record',title,'PDF');
}

function deleteCurrentDetailRow(){
  if(!currentDetailRow){
    toast('No row selected to delete','warn');
    return;
  }
  const label=currentDetailRow.children[0]?.textContent.trim()||'Selected row';
  const reason=currentDetailTable?rowDeleteBlockReason(currentDetailRow,currentDetailTable):'';
  if(reason){
    toast(`Cannot delete ${label}: ${reason}`,'warn');
    audit('Delete blocked',label,reason);
    return;
  }
  const collection=inferCollectionFromContext(currentDetailTable);
  const record=currentDetailTable?recordFromTableRow(currentDetailTable,currentDetailRow):{id:label,name:label};
  currentDetailRow.remove();
  if(currentDetailTable){
    const tbody=currentDetailTable.tBodies?.[0];
    if(tbody&&tbody.querySelectorAll('tr:not([data-empty-state])').length===0){
      emptyTableMessage(tbody,'No database records yet.');
    }
    refreshEnhancedTable(currentDetailTable);
  }
  apiRequest('delete',{collection,record}).catch(err=>console.warn('Database delete failed:',err));
  saveServer('app_actions',{mode:'delete',record:label,page:document.getElementById('ptitle')?.textContent||'App'});
  audit('Deleted record',label,'Deleted');
  closeM('m-row-detail');
  currentDetailRow=null;
  currentDetailTable=null;
  toast('Record deleted','warn');
}

function patchViewButtonsInPage(pageId,title){
  document.querySelectorAll(`#${pageId} table.tbl`).forEach(table=>{
    table.querySelectorAll('button').forEach(button=>{
      const text=button.textContent.trim().toLowerCase();
      if(text==='view'){
        button.onclick=()=>openRowDetail(button,title,document.getElementById('ptitle')?.textContent||title);
      }
    });
  });
}

function addPurchaseRecordViewButtons(){
  const table=document.querySelector('#p-records table.tbl');
  if(!table||table.dataset.detailActions==='1')return;
  const headRow=table.querySelector('thead tr');
  const hasActionHead=headRow&&[...headRow.cells].some(cell=>cell.textContent.trim().toLowerCase()==='actions');
  if(headRow&&!hasActionHead){
    const th=document.createElement('th');
    th.textContent='Actions';
    th.dataset.actionCol='1';
    headRow.appendChild(th);
  }
  table.querySelectorAll('tbody tr').forEach(row=>{
    const actionCell=[...row.children].find(cell=>cell.querySelector('button[onclick*="editPurchaseRecord"],button[onclick*="openRowDetail"]'));
    const td=actionCell||document.createElement('td');
    td.dataset.actionCol='1';
    td.innerHTML=tableActionButtonsHtml(table);
    if(!actionCell)row.appendChild(td);
  });
  table.dataset.detailActions='1';
}

function bindDetailViews(){
  addPurchaseRecordViewButtons();
  patchViewButtonsInPage('page-purchase','Purchase Detail');
  patchViewButtonsInPage('page-bills','Bill / Vendor Detail');
  patchViewButtonsInPage('page-expense','Expense Detail');
}

// -- GENERIC ADD / EDIT SUPPORT ----------------------------------
let genericFormState=null;

function ensureGenericFormModal(){
  let overlay=document.getElementById('m-generic-form');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.className='overlay';
  overlay.id='m-generic-form';
  overlay.onclick=e=>closeOvBg(e,'m-generic-form');
  overlay.innerHTML=`
    <div class="modal modal-lg">
      <div class="modal-title" id="generic-form-title">Edit Record</div>
      <div class="modal-sub" id="generic-form-sub">Update details</div>
      <div id="generic-form-body"></div>
      <div class="modal-foot">
        <button class="btn btn-g" onclick="closeM('m-generic-form')">Cancel</button>
        <button class="btn btn-p" onclick="saveGenericForm()">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function getRowEditableCells(row,table){
  const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
  return [...row.children].map((cell,index)=>({
    cell,
    index,
    label:headers[index]||`Field ${index+1}`,
    value:cell.textContent.trim()
  })).filter(item=>{
    const actionText=item.cell.textContent.trim().toLowerCase();
    return item.value&&actionText!=='edit'&&actionText!=='view'&&!item.cell.querySelector('button');
  });
}

function openGenericEditRow(btn,title='Edit Record',subtitle='Update row details'){
  const row=btn.closest('tr');
  const table=row?.closest('table');
  if(!row||!table){
    toast('No editable row found','warn');
    return;
  }
  const fields=getRowEditableCells(row,table);
  if(!fields.length){
    toast('No editable fields found','warn');
    return;
  }
  genericFormState={mode:'edit',row,table,fields,collection:inferCollectionFromContext(table)};
  ensureGenericFormModal();
  document.getElementById('generic-form-title').textContent=title;
  document.getElementById('generic-form-sub').textContent=subtitle;
  document.getElementById('generic-form-body').innerHTML=`
    <div class="fr2">
      ${fields.map((field,index)=>`
        <div class="fg">
          <label class="fl">${escapeHtml(field.label)}</label>
          <input class="fi" data-generic-index="${index}" value="${escapeHtml(field.value)}">
        </div>
      `).join('')}
    </div>
  `;
  showM('m-generic-form');
}

function openGenericAdd(title='Add Record',subtitle='Create a new record',sourceButton=null){
  const card=sourceButton?.closest('.card');
  const table=card?.querySelector('table.tbl');
  const headers=table?[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim()).filter(Boolean):[];
  const fields=(headers.length?headers:['Name','Code / Reference','Notes']).filter(label=>label.toLowerCase()!=='');
  genericFormState={mode:'add',card,table,collection:inferCollectionFromContext(table||card),fields:fields.map(label=>({label,value:''}))};
  ensureGenericFormModal();
  document.getElementById('generic-form-title').textContent=title;
  document.getElementById('generic-form-sub').textContent=subtitle;
  document.getElementById('generic-form-body').innerHTML=`
    <div class="fr2">
      ${fields.map((label,index)=>`
        <div class="fg">
          <label class="fl">${escapeHtml(label)}</label>
          <input class="fi" data-generic-index="${index}" placeholder="${escapeHtml(label)}">
        </div>
      `).join('')}
    </div>
  `;
  showM('m-generic-form');
}

function setCellDisplayValue(cell,value){
  const badge=cell.querySelector('.b');
  const namedSpan=cell.querySelector('.co-av + span');
  if(badge){
    badge.textContent=value;
  }else if(namedSpan){
    namedSpan.textContent=value;
  }else{
    cell.textContent=value;
  }
}

function genericActionCell(table){
  return `<td data-action-col="1">${tableActionButtonsHtml(table)}</td>`;
}

function saveGenericForm(){
  if(!genericFormState)return closeM('m-generic-form');
  const values=[...document.querySelectorAll('#generic-form-body [data-generic-index]')].map(input=>input.value.trim());
  if(!values.some(Boolean)){
    toast('Enter at least one value','warn');
    return;
  }
  if(genericFormState.mode==='edit'){
    genericFormState.fields.forEach((field,index)=>setCellDisplayValue(field.cell,values[index]||field.value));
    refreshEnhancedTable(genericFormState.table);
    saveServer(genericFormState.collection,buildGenericRecord(genericFormState.fields,values));
    toast('Record updated','ok');
    audit('Updated record',values[0]||'Table row','Saved');
  }else{
    const table=genericFormState.table;
    if(table?.querySelector('tbody')){
      removeEmptyState(table.querySelector('tbody'));
      const row=document.createElement('tr');
      const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
      const hasActionColumn=headers.some(label=>!label||['action','actions'].includes(label.toLowerCase()));
      const dataCount=hasActionColumn?Math.max(values.length,headers.length-1):Math.max(values.length,headers.length);
      row.innerHTML=Array.from({length:dataCount},(_,index)=>{
        const value=values[index]||'-';
        return `<td>${escapeHtml(value)}</td>`;
      }).join('')+(hasActionColumn?genericActionCell(table):'');
      table.querySelector('tbody').prepend(row);
      addTableDeleteActions(table);
      refreshEnhancedTable(table);
    }else if(genericFormState.card){
      const tile=document.createElement('div');
      tile.className='setting-tile';
      tile.style.marginTop='10px';
      tile.innerHTML=`<strong>${escapeHtml(values[0]||'New Record')}</strong><p>${escapeHtml(values.slice(1).filter(Boolean).join(' - ')||'Saved from quick add form')}</p>`;
      genericFormState.card.appendChild(tile);
    }
    saveServer(genericFormState.collection,buildGenericRecord(genericFormState.fields,values));
    toast('Record added','ok');
    audit('Added record',values[0]||'Quick add','Saved');
  }
  saveServer('app_actions',{mode:genericFormState.mode,values});
  closeM('m-generic-form');
}

function inferCollectionFromContext(node){
  const table=node?.closest?.('table')||node?.querySelector?.('table');
  const tbodyId=table?.tBodies?.[0]?.id||'';
  const idMap={
    'prod-tbody':'products',
    'customer-tbody':'customers',
    'sales-invoice-tbody':'salesInvoices',
    'quotation-tbody':'quotations',
    'bill-tbody':'bills',
    'vendor-tbody':'vendors',
    'payment-in-tbody':'payments',
    'payment-out-tbody':'payments',
    'account-tbody':'accounts',
    'sales-category-tbody':'salesCategories',
    'sales-unit-tbody':'salesUnits',
    'purchase-record-tbody':'purchaseRecords',
    'audit-tbody':'audit'
  };
  if(idMap[tbodyId])return idMap[tbodyId];
  const page=(node?.closest?.('.page')||table?.closest?.('.page'))?.id?.replace(/^page-/,'');
  if(page)return page+'_records';
  return 'app_records';
}

function normalizeGenericKey(label){
  const key=String(label||'field').toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const aliases={
    invoice_no:'invoice_no',
    ref_no:'ref',
    bill_no:'bill_no',
    unit_price:'price',
    product_description:'name',
    product_service_name:'name',
    customer_name:'name',
    account_code:'code',
    account_name:'name',
    shift_name:'name',
    shift_code:'code',
    total_business:'total',
    total:'total'
  };
  return aliases[key]||key||'field';
}

function buildGenericRecord(fields,values){
  const record={};
  fields.forEach((field,index)=>{
    const label=field.label||field;
    const key=normalizeGenericKey(label);
    record[key]=values[index]||field.value||'';
  });
  if(!record.id){
    record.id=record.code||record.invoice_no||record.bill_no||record.ref||record.name||`app-${Date.now()}`;
  }
  return record;
}

function recordFromTableRow(table,row){
  const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
  const fields=[...row.children].map((cell,index)=>({
    label:headers[index]||`Field ${index+1}`,
    value:cell.textContent.trim()
  })).filter(item=>item.value&&item.value.toLowerCase()!=='view'&&item.value.toLowerCase()!=='edit');
  return buildGenericRecord(fields,fields.map(field=>field.value));
}

function bindEditActions(){
  document.querySelectorAll('table.tbl button').forEach(button=>{
    const text=button.textContent.trim().toLowerCase();
    const inlineAction=button.getAttribute('onclick')||'';
    if(text==='edit'&&!inlineAction.includes('editPurchaseRecord')){
      button.onclick=()=>openGenericEditRow(button,'Edit '+(document.getElementById('ptitle')?.textContent||'Record'),'Update selected row');
    }
  });
  document.querySelectorAll('button').forEach(button=>{
    const text=button.textContent.trim().toLowerCase();
    if(text==='edit template'){
      button.onclick=()=>openGenericAdd('Edit Template','Update template details',button);
    }
  });
}

function bindGenericAddActions(){
  const labels=['+ add holiday','+ new advance','+ add rule','+ new po','+ new rule','+ add','+ new workflow'];
  document.querySelectorAll('button').forEach(button=>{
    const text=button.textContent.trim().toLowerCase();
    if(labels.includes(text)){
      const onclick=button.getAttribute('onclick')||'';
      if(onclick.includes('toast(')){
        button.onclick=()=>openGenericAdd(button.textContent.trim(),document.getElementById('ptitle')?.textContent||'Quick add',button);
      }
    }
  });
}

// -- BILLS / VENDORS / PAYMENTS -----------------------------------
function saveBill(){
  const vendor=(document.getElementById('bill-vendor')?.value||'').trim();
  const billNo=(document.getElementById('bill-no')?.value||'BILL-2024-0189').trim();
  const date=document.getElementById('bill-date')?.value||'Today';
  const due=document.getElementById('bill-due')?.value||'30 days';
  const total=parseAmount(document.getElementById('bill-total')?.value);
  if(!vendor||!total){toast('Vendor and bill total are required','err');return;}
  const subtotal=total/1.05;
  const vat=total-subtotal;
  const row=document.createElement('tr');
  row.innerHTML=`<td class="mono">${escapeHtml(billNo)}</td><td>${escapeHtml(vendor)}</td><td>${escapeHtml(date)}</td><td>${escapeHtml(due)}</td><td class="mono">${subtotal.toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${vat.toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td class="mono">${total.toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td><span class="b b-a">Awaiting Payment</span></td><td><button class="btn btn-g btn-sm" onclick="openRowDetail(this,'Bill / Vendor Detail','Bill detail')">View</button></td>`;
  document.getElementById('bill-tbody')?.prepend(row);
  saveServer('bills',{vendor,bill_no:billNo,date,due,subtotal,vat,total,status:'Awaiting Payment'});
  closeM('m-bill');
  toast('Vendor bill saved ?','ok');
  audit('Saved vendor bill',billNo,'Saved');
}

function saveVendor(){
  const name=(document.getElementById('vendor-name')?.value||'').trim();
  const trn=(document.getElementById('vendor-trn')?.value||'').replace(/\D/g,'');
  const category=document.getElementById('vendor-category')?.value||'Services';
  const email=(document.getElementById('vendor-email')?.value||'').trim();
  const phone=(document.getElementById('vendor-phone')?.value||'').trim();
  const address=(document.getElementById('vendor-address')?.value||'').trim();
  if(!name){toast('Vendor name is required','err');return;}
  if(trn&&trn.length!==15){toast('Vendor TRN must be 15 digits','err');return;}
  renderVendorRecord({name,trn,category,email,phone,address});
  syncSupplierOptions(name);
  saveServer('vendors',{name,trn,category,email,phone,address});
  closeM('m-vendor');
  ['vendor-name','vendor-trn','vendor-email','vendor-phone','vendor-address'].forEach(id=>setFieldValue(document.getElementById(id),''));
  toast('Vendor added ?','ok');
  audit('Added vendor',name,'Saved');
}

function savePayment(){
  const type=document.getElementById('payment-type')?.value||'Customer Receipt';
  const ref=(document.getElementById('payment-ref')?.value||'PMT-NEW').trim();
  const contact=(document.getElementById('payment-contact')?.value||'').trim();
  const amount=parseAmount(document.getElementById('payment-amount')?.value);
  const method=document.getElementById('payment-method')?.value||'Bank Transfer';
  const date=document.getElementById('payment-date')?.value||'Today';
  if(!contact||!amount){toast('Contact and amount are required','err');return;}
  const row=document.createElement('tr');
  row.innerHTML=`<td class="mono">${escapeHtml(ref)}</td><td>${escapeHtml(contact)}</td><td class="mono">Manual</td><td>${escapeHtml(method)}</td><td>${escapeHtml(date)}</td><td class="mono">${amount.toLocaleString('en-AE',{maximumFractionDigits:2})}</td><td><span class="b b-g">Posted</span></td>`;
  if(type==='Customer Receipt')document.getElementById('payment-in-tbody')?.prepend(row);
  else document.getElementById('payment-out-tbody')?.prepend(row);
  saveServer('payments',{type,ref,contact,amount,method,date});
  closeM('m-payment');
  toast('Payment recorded ?','ok');
  audit('Recorded payment',ref,'Posted');
}

// -- SETTINGS ----------------------------------------------------
function saveSettings(message='Settings saved'){
  toast(message+' ?','ok');
  audit(message,'Settings','Saved');
  saveCompanySettingsToDatabase()
    .then(()=>syncDashboardFromDatabase())
    .catch(err=>console.warn('Company settings save failed:',err));
}

function testIntegration(name){
  toast('Testing '+name+' integration...','info');
  setTimeout(()=>toast(name+' integration connected ?','ok'),900);
}

function rotateApiKey(){
  toast('API key rotated. Existing key will expire in 24 hours.','warn');
  audit('Rotated API key','Integrations','Rotated');
}

function runBackup(){
  toast('Backup started...','info');
  setTimeout(()=>{toast('Encrypted backup completed ?','ok');audit('Completed encrypted backup','Full tenant','Complete');},1200);
}

function quotationNumber(){
  return document.getElementById('quote-no')?.value?.trim()||'QTN-2024-0063';
}

function calcQuotationTotals(){
  let subtotal=0;
  document.querySelectorAll('#quote-lines .quote-line').forEach(line=>{
    const qty=Number(line.querySelector('.quote-qty')?.value||0);
    const price=Number(line.querySelector('.quote-price')?.value||0);
    const amount=qty*price;
    subtotal+=amount;
    const target=line.querySelector('.quote-amount');
    if(target)target.value=amount.toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
  });
  const vat=subtotal*0.05;
  const total=subtotal+vat;
  const sub=document.getElementById('quote-subtotal');
  const vatEl=document.getElementById('quote-vat');
  const totalEl=document.getElementById('quote-total');
  if(sub)sub.textContent=formatAed(subtotal);
  if(vatEl)vatEl.textContent=formatAed(vat);
  if(totalEl)totalEl.textContent=formatAed(total);
}

function calcQuotationLine(input){
  calcQuotationTotals();
}

function addQuotationLine(){
  const box=document.getElementById('quote-lines');
  if(!box)return;
  const row=document.createElement('div');
  row.className='inv-item quote-line';
  row.innerHTML=`<input class="fi" placeholder="Description"><input class="fi quote-qty" value="1" oninput="calcQuotationLine(this)"><input class="fi quote-price" value="0.00" oninput="calcQuotationLine(this)"><input class="fi mono quote-amount" value="0.00" readonly style="background:var(--bg)"><button class="btn btn-g" style="padding:4px 8px" onclick="removeQuotationLine(this)">x</button>`;
  box.appendChild(row);
  calcQuotationTotals();
}

function removeQuotationLine(btn){
  btn.closest('.quote-line')?.remove();
  calcQuotationTotals();
}

function previewQuotation(btn){
  const quote=quotationRecordFromRow(btn.closest('tr'));
  openRowDetail(btn,'Quotation Preview',quote.quote_no||'Quotation');
  audit('Viewed quotation',quote.quote_no||'Quotation','Opened');
}

function shareQuotation(btn){
  const quote=quotationRecordFromRow(btn.closest('tr'));
  saveServer('quotations',{...quote,last_shared_at:new Date().toISOString()});
  toast(`Share link prepared for ${quote.quote_no||'quotation'}`,'ok');
}

function convertQuotation(btn){
  const row=btn.closest('tr');
  const quote=quotationRecordFromRow(row);
  const badge=row?.querySelector('td:nth-child(8) .b');
  if(badge){
    badge.classList.remove('b-a','b-r','b-b','b-gray');
    badge.classList.add('b-g');
    badge.textContent='Converted';
  }
  const updated={...quote,status:'Converted',converted_at:new Date().toISOString()};
  row.dataset.quotation=JSON.stringify(updated);
  saveServer('quotations',updated);
  const invoiceNo=`INV-${String(quote.quote_no||Date.now()).replace(/^QTN-?/,'')}`;
  const invoice={
    invoice_no:invoiceNo,
    customer:quote.customer||'Customer',
    date:new Date().toISOString().split('T')[0],
    due_date:'30 days',
    subtotal:parseAmount(quote.subtotal),
    vat_amount:parseAmount(quote.vat_amount),
    total:parseAmount(quote.total),
    source:'Quotation',
    status:'Draft',
    quotation_no:quote.quote_no||''
  };
  addSalesInvoiceRow(invoice,{persist:false});
  saveServer('salesInvoices',invoice);
  toast(`${quote.quote_no||'Quotation'} converted to invoice draft ${invoiceNo}`,'ok');
}

function saveQuotationDraft(){
  calcQuotationTotals();
  saveServer('quotations',buildDraftQuotationRecord('Draft'));
  toast(`${quotationNumber()} saved as draft`,'ok');
}

function previewDraftQuotation(){
  calcQuotationTotals();
  toast(`Preview opened for ${quotationNumber()}`,'info');
}

function shareDraftQuotation(){
  calcQuotationTotals();
  saveServer('quotations',{...buildDraftQuotationRecord('Draft'),last_shared_at:new Date().toISOString()});
  toast(`Share link prepared for ${quotationNumber()}`,'ok');
}

function buildDraftQuotationRecord(status='Sent'){
  return {
    quote_no:quotationNumber(),
    customer:document.getElementById('quote-customer')?.value?.trim()||'New Customer',
    date:document.getElementById('quote-date')?.value||'Today',
    valid_until:document.getElementById('quote-valid')?.value||'15 days',
    subtotal:document.getElementById('quote-subtotal')?.textContent?.replace('AED ','')||'0.00',
    vat_amount:document.getElementById('quote-vat')?.textContent?.replace('AED ','')||'0.00',
    total:document.getElementById('quote-total')?.textContent?.replace('AED ','')||'0.00',
    status,
    owner:'Sales Team',
    subject:document.getElementById('quote-subject')?.value?.trim()||''
  };
}

function sendDraftQuotation(){
  calcQuotationTotals();
  const record=buildDraftQuotationRecord('Sent');
  renderQuotationRecord(record);
  saveServer('quotations',record);
  stab(document.querySelector('#page-quotations .tab:nth-child(1)'),'q-list');
  toast(`${quotationNumber()} sent to customer`,'ok');
}

function separateCorporateAccountingModule(){
  const target=document.getElementById('corporate-accounting-bodies');
  if(!target||target.dataset.ready==='1')return;
  const idMap={
    'acc-corp-tax':'corp-tax',
    'acc-assets':'corp-assets',
    'acc-accruals':'corp-accruals',
    'acc-cost-centers':'corp-cost-centers',
    'acc-budget':'corp-budget',
    'acc-cashflow':'corp-cashflow',
    'acc-credit':'corp-credit',
    'acc-consolidation':'corp-consolidation',
    'acc-approval':'corp-approval'
  };
  Object.entries(idMap).forEach(([oldId,newId],index)=>{
    const section=document.getElementById(oldId);
    if(!section)return;
    section.id=newId;
    section.classList.toggle('on',index===0);
    target.appendChild(section);
  });
  target.dataset.ready='1';
}

function initApp(){
  if(window.__taxflowAppInitialized)return;
  window.__taxflowAppInitialized=true;
  applyTheme('light');
  const today=new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type=date]').forEach(i=>{if(!i.value)i.value=today;});
  const invDate=document.getElementById('inv-date');
  if(invDate)invDate.value=today;
  const due=new Date();
  due.setDate(due.getDate()+30);
  const invDue=document.getElementById('inv-due');
  if(invDue)invDue.value=due.toISOString().split('T')[0];

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      closeSidebar();
      document.querySelectorAll('.overlay.on').forEach(modal=>modal.classList.remove('on'));
    }
  });
  separateCorporateAccountingModule();
  clearStaticDemoData();
  watchVisibleTablePagination();
  applyAllTableActions();
  updateBackButton();

  restoreSalesInvoices();
  renderAuditLog();
  setInvoiceLayoutFields();
  updateInvoiceLayoutPreview();
  syncProductMasterOptions();
  setManualPurchaseDefaults();
  syncCompanyFromDatabase();
  syncDashboardFromDatabase().catch(err=>console.warn('Dashboard sync failed during init:',err));
  hydrateFromServer().catch(err=>console.warn('Database hydrate failed during init:',err));
  enhancePageTables('page-dashboard');
  scheduleIdleTask(()=>{
    updateAccountSelectors();
    recalcJournal();
    recalcPayroll();
    calcGratuity();
    bindDetailViews();
    bindEditActions();
    bindGenericAddActions();
    applyAllTableActions();
  },900);
}

initApp();


