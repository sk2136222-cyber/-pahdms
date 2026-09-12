/* PAHDMS V5 - Monthly Report Entry */
console.log("Monthly Report Entry Loaded");

if (!requireLogin()) { throw new Error("Authentication required"); }
const supabaseClient = window.db;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const OPD_SPECIES = [
  {key:'e', label:'E'},
  {key:'b', label:'B'},
  {key:'sgp', label:'S,G,Pig'},
  {key:'cd', label:'Cat & Dog'},
  {key:'other', label:'Other'},
];
const OPD_TYPES = [
  {key:'new_opd', label:'New OPD (Paid)'},
  {key:'old_opd', label:'Old OPD'},
  {key:'camp_opd', label:'Camp OPD'},
];

const SEMEN_METRICS = [
  {key:'opening_balance', label:'Monthly Opening Balance'},
  {key:'received', label:'Received During Month'},
  {key:'total_monthly', label:'Total (Monthly)', computed:(v)=> (v.opening_balance||0) + (v.received||0)},
  {key:'ai_during_month', label:'AI During Month'},
  {key:'balance', label:'Balance', computed:(v)=> (v.total_monthly||0) - (v.ai_during_month||0)},
  {key:'animal_covered', label:'Animal Covered'},
  {key:'animal_covered_3m_prior', label:'Animal Covered (3 Month Prior)'},
  {key:'pd_tested', label:'PD (Tested)'},
  {key:'pd_positive', label:'PD +VE'},
  {key:'animal_ve_9m_prior', label:'Animal +VE (9M Prior)'},
  {key:'male_calf_born', label:'Male Calf Born'},
  {key:'female_calf_born', label:'Female Calf Born'},
];
const SEMEN_METRIC_GROUPS = [
  {id:'ai', label:'AI Total', keys:['ai_during_month']},
  {id:'animal_covered', label:'Animal Covered Total', keys:['animal_covered']},
  {id:'pd', label:'PD Total', keys:['pd_positive']},
  {id:'calf', label:'Calf Total', keys:['male_calf_born','female_calf_born']},
];
const CATTLE_BREEDS = [
  {key:'hf', label:'HF (Rs.25)'}, {key:'jersey', label:'Jersey (Rs.25)'}, {key:'hfc_cb', label:'HFC/CB (Rs.25)'},
  {key:'sahi', label:'Sahi (Rs.25)'}, {key:'pt_sahi', label:'PT Sahi (Rs.25)'},
  {key:'hf_imp', label:'HF Imp (Rs.35)'}, {key:'hf_ett', label:'HF ETT (Rs.35)'}, {key:'jr_imp', label:'JR Imp (Rs.35)'},
  {key:'imp_hf', label:'Imp HF (50/-)'},
  {key:'hf250', label:'HF (Sexed Rs.250)'}, {key:'jr250', label:'JR (Sexed Rs.250)'},
];
const BUFFALO_BREEDS = [
  {key:'murrah25', label:'Murrah (Rs.25)'}, {key:'nili25', label:'Nili (Rs.25)'},
  {key:'murrah250', label:'Murrah (Rs.250 Sexed)'}, {key:'nili250', label:'Nili (Rs.250 Sexed)'},
];



const SECTIONS = [
  { id:'opd', label:'OPD (species-wise)', icon:'🩺', speciesTable:true, fields:[
      {key:'surgical_minor', label:'Surgical – Minor'},
      {key:'surgical_major', label:'Surgical – Major'},
      {key:'obstetrical_minor', label:'Obstetrical – Minor'},
      {key:'obstetrical_major', label:'Obstetrical – Major'},
  ], totals:[
      {id:'total_surgical', label:'Total Surgical', keys:['surgical_minor','surgical_major']},
      {id:'total_obstetrical', label:'Total Obstetrical', keys:['obstetrical_minor','obstetrical_major']},
  ]},
    { id:'welfare', label:'SPCA, Gaushala & Cattle Pound', icon:'🐄', fields:[
      {key:'spca_cow', label:'SPCA – Cow', optional:true},
      {key:'spca_dog', label:'SPCA – Dog', optional:true},
      {key:'spca_cat', label:'SPCA – Cat', optional:true},
      {key:'spca_horse', label:'SPCA – Horse', optional:true},
      {key:'spca_monkey', label:'SPCA – Monkey', optional:true},
      {key:'spca_birds', label:'SPCA – Birds', optional:true},
      {key:'spca_other', label:'SPCA – Others', optional:true},
      {key:'gaushala_cases', label:'Gaushala Cases', optional:true},
      {key:'cattle_pound_cases', label:'Cattle Pound Cases', optional:true},
      {key:'stray_cattle', label:'No. of Stray Cattle', optional:true},
      {key:'gaushala_animals', label:'Animals in Gaushala', optional:true},
  ], totals:[
      {id:'total_spca', label:'Total SPCA Cases', keys:['spca_cow','spca_dog','spca_cat','spca_horse','spca_monkey','spca_birds','spca_other']},
  ]},
  { id:'breeding', label:'PD, Castration & KCC', icon:'🐂', fields:[
      {key:'pd_paid_cow', label:'Paid PD – Cow'},
      {key:'pd_paid_buff', label:'Paid PD – Buffalo'},
      {key:'castration_bovine', label:'Castration – Bovine'},
      {key:'castration_sgp', label:'Castration – S,G,Pig'},
      {key:'kcc', label:'KCC'},
  ], totals:[
      {id:'total_castration', label:'Total Castration', keys:['castration_bovine','castration_sgp']},
  ]},
  { id:'certificates', label:'Health Certificates & Post Mortem', icon:'📄', fields:[
      {key:'hc_large', label:'Health Cert. – Large Animal'},
      {key:'hc_sgp', label:'Health Cert. – S,G,Pig'},
      {key:'hc_cd', label:'Health Cert. – Cat & Dog'},
      {key:'hc_poultry_small', label:'Health Cert. – Poultry (1–5000)'},
      {key:'hc_poultry_large', label:'Health Cert. – Poultry (Above 5000)'},
      {key:'pm_large', label:'Post Mortem – Large Animal'},
      {key:'pm_sgp', label:'Post Mortem – S,G,Pig'},
      {key:'pm_cd', label:'Post Mortem – Cat & Dog'},
      {key:'pm_poultry', label:'Post Mortem – Poultry'},
      {key:'vl_large', label:'Vetero-Legal PM – Large'},
      {key:'vl_small', label:'Vetero-Legal PM – Small'},
      {key:'vl_pet', label:'Vetero-Legal PM – Pet'},
      {key:'vl_poultry', label:'Vetero-Legal PM – Poultry'},
      {key:'ec_la', label:'Export Cert. – Large Animal'},
      {key:'ec_sa', label:'Export Cert. – Small Animal'},
      {key:'ec_cd', label:'Export Cert. – Cat & Dog'},
      {key:'ec_bird', label:'Export Cert. – Bird'},
  ], totals:[
      {id:'total_hc', label:'Total Health Certificates', keys:['hc_large','hc_sgp','hc_cd','hc_poultry_small','hc_poultry_large']},
      {id:'total_pm', label:'Total Post Mortem', keys:['pm_large','pm_sgp','pm_cd','pm_poultry']},
      {id:'total_vl', label:'Total Vetero-Legal PM', keys:['vl_large','vl_small','vl_pet','vl_poultry']},
      {id:'total_ec', label:'Total Export Certificate', keys:['ec_la','ec_sa','ec_cd','ec_bird']},
  ]},
  { id:'lab_extension', label:'Lab & Extension', icon:'🔬', fields:[
      {key:'lab_blood', label:'Lab – Blood', optional:true},
{key:'lab_fecal', label:'Lab – Fecal', optional:true},
{key:'lab_milk', label:'Lab – Milk', optional:true},
{key:'lab_urine', label:'Lab – Urine', optional:true},
      {key:'fa_camps', label:'Farmer Awareness – No. of Camps'},
      {key:'fa_villages', label:'Farmer Awareness – Villages Covered'},
      {key:'fa_farmers', label:'Farmer Awareness – Farmers Attended'},
      {key:'fa_animals_treated', label:'Farmer Awareness – Animals Treated'},
      {key:'scheme_camps', label:'Camp Under Scheme – No. of Camps'},
      {key:'scheme_villages', label:'Camp Under Scheme – Villages Covered'},
      {key:'scheme_farmers', label:'Camp Under Scheme – Farmers Attended'},
      {key:'scheme_animals_treated', label:'Camp Under Scheme – Animals Treated'},
      {key:'lectures_no', label:'No. of Lectures'},
      {key:'lectures_students', label:'No. of Students Attended'},
      {key:'school_name', label:'School Name (latest visit)', type:'text'},
      {key:'lecture_date', label:'Visit Date', type:'date'},
      {key:'lecture_time_min', label:'Time (Min)'},
      {key:'lecture_no_students', label:'Students Present (this visit)'},
  ], fieldGroups:[
      {title:'Laboratory Report', keys:['lab_blood','lab_fecal','lab_milk','lab_urine']},
      {title:'Farmer Awareness & Animal Welfare', keys:['fa_camps','fa_villages','fa_farmers','fa_animals_treated']},
      {title:'Camp Under Any Scheme', keys:['scheme_camps','scheme_villages','scheme_farmers','scheme_animals_treated']},
      {title:'Lectures', keys:['lectures_no','lectures_students']},
      {title:'School Visit Log', keys:['school_name','lecture_date','lecture_time_min','lecture_no_students']},
  ]},
    { id:'egg_meat', label:'Egg & Meat Report', icon:'🥚', fields:[
      {key:'layer_farms', label:'Layer – No. of Farms', optional:true},
      {key:'layer_birds', label:'Layer – No. of Birds', optional:true},
      {key:'layer_new_chicks', label:'Layer – New Chicks Inducted', optional:true},
      {key:'layer_eggs_produced', label:'Layer – No. of Eggs Produced', optional:true},
      {key:'broiler_farms', label:'Broiler – No. of Farms', optional:true},
      {key:'broiler_birds', label:'Broiler – No. of Birds', optional:true},
      {key:'broiler_new_chicks', label:'Broiler – New Chicks Inducted', optional:true},
      {key:'broiler_slaughtered_sold', label:'Broiler – Birds Slaughtered/Sold', optional:true},
      {key:'broiler_avg_live_wt', label:'Broiler – Avg. Live Wt. (kg)', optional:true},
      {key:'meat_shops', label:'No. of Meat Shops', optional:true},
      {key:'meat_goat', label:'Slaughtered – Goat', optional:true},
      {key:'meat_sheep', label:'Slaughtered – Sheep', optional:true},
      {key:'meat_pig', label:'Slaughtered – Pig', optional:true},
      {key:'meat_poultry', label:'Slaughtered – Poultry', optional:true},
      {key:'total_meat_kg', label:'Total Meat Produced (kg)', optional:true},
      {key:'meat_rejected_kg', label:'Meat Rejected (kg)', optional:true},
  ], fieldGroups:[
      {title:'Layer Farm', keys:['layer_farms','layer_birds','layer_new_chicks','layer_eggs_produced']},
      {title:'Broiler Farm', keys:['broiler_farms','broiler_birds','broiler_new_chicks','broiler_slaughtered_sold','broiler_avg_live_wt']},
      {title:'Butcher Shops / Meat Shops', keys:['meat_shops','meat_goat','meat_sheep','meat_pig','meat_poultry','total_meat_kg','meat_rejected_kg']},
  ], totals:[
      {id:'total_slaughtered', label:'Total Animals/Birds Slaughtered', keys:['meat_goat','meat_sheep','meat_pig','meat_poultry']},
  ]},
   { id:'vaccination', label:'Vaccination Report', icon:'💉', fields:[
      {key:'hsv_c', label:'HSV – C'}, {key:'hsv_b', label:'HSV – B'},
      {key:'bqv_ccalf', label:'BQV – C Calf'}, {key:'bqv_bcalf', label:'BQV – B Calf'},
      {key:'lsdv_c', label:'LSDV – C'},
      {key:'fmdv_c', label:'FMDV – C'}, {key:'fmdv_b', label:'FMDV – B'}, {key:'fmdv_ccalf', label:'FMDV – C Calf'}, {key:'fmdv_bcalf', label:'FMDV – B Calf'}, {key:'fmdv_s', label:'FMDV – S'}, {key:'fmdv_g', label:'FMDV – G'}, {key:'fmdv_pig', label:'FMDV – Pig'},
      {key:'brucella_c', label:'Brucella – C'}, {key:'brucella_b', label:'Brucella – B'},
      {key:'ppr_s', label:'PPR – S'}, {key:'ppr_g', label:'PPR – G'},
      {key:'etv_s', label:'ETV – S'}, {key:'etv_g', label:'ETV – G'},
      {key:'csf_pig', label:'CSF – Pig', optional:true},
      {key:'ranikhet_f1', label:'Ranikhet – F-1', optional:true}, {key:'ranikhet_r2b', label:'Ranikhet – R-2B', optional:true},
      {key:'fowl_pox', label:'Fowl Pox', optional:true},
      {key:'arv_c', label:'ARV – C', optional:true}, {key:'arv_b', label:'ARV – B', optional:true}, {key:'arv_ccalf', label:'ARV – C Calf', optional:true}, {key:'arv_bcalf', label:'ARV – B Calf', optional:true}, {key:'arv_s', label:'ARV – S', optional:true}, {key:'arv_g', label:'ARV – G', optional:true}, {key:'arv_pig', label:'ARV – Pig', optional:true}, {key:'arv_dog', label:'ARV – Dog', optional:true},
  ], fieldGroups:[
      {title:'HSV', keys:['hsv_c','hsv_b']},
      {title:'BQV', keys:['bqv_ccalf','bqv_bcalf']},
      {title:'LSDV', keys:['lsdv_c']},
      {title:'FMDV', keys:['fmdv_c','fmdv_b','fmdv_ccalf','fmdv_bcalf','fmdv_s','fmdv_g','fmdv_pig']},
      {title:'Brucella', keys:['brucella_c','brucella_b']},
      {title:'PPR', keys:['ppr_s','ppr_g']},
      {title:'ETV', keys:['etv_s','etv_g']},
      {title:'CSF', keys:['csf_pig']},
      {title:'Ranikhet', keys:['ranikhet_f1','ranikhet_r2b']},
      {title:'Fowl Pox', keys:['fowl_pox']},
      {title:'ARV', keys:['arv_c','arv_b','arv_ccalf','arv_bcalf','arv_s','arv_g','arv_pig','arv_dog']},
  ], totals:[
      {id:'total_vaccinations', label:'Total Vaccinations (All)', keys:['hsv_c','hsv_b','bqv_ccalf','bqv_bcalf','lsdv_c','fmdv_c','fmdv_b','fmdv_ccalf','fmdv_bcalf','fmdv_s','fmdv_g','fmdv_pig','brucella_c','brucella_b','ppr_s','ppr_g','etv_s','etv_g','csf_pig','ranikhet_f1','ranikhet_r2b','fowl_pox','arv_c','arv_b','arv_ccalf','arv_bcalf','arv_s','arv_g','arv_pig','arv_dog']},
  ]},
  { id:'fees', label:'Fee Collection', icon:'💰', fields:[
      {key:'fee_opd', label:'OPD Fee'},
      {key:'fee_surgical', label:'Surgical Fee'},
      {key:'fee_obstetrical', label:'Obstetrical Fee'},
      {key:'fee_pd', label:'PD Fee'},
      {key:'fee_castration', label:'Castration Fee'},
      {key:'fee_hc', label:'HC Fee'},
      {key:'fee_pm', label:'PM Fee'},
      {key:'fee_lab', label:'Lab Fee'},
      {key:'fee_ai_cow', label:'AI Cow Fee'},
      {key:'fee_ai_buff', label:'AI Buff Fee'},
      {key:'fee_other', label:'Any Other Fee'},
  ], totals:[
      {id:'fee_grand_total', label:'Grand Total', keys:['fee_opd','fee_surgical','fee_obstetrical','fee_pd','fee_castration','fee_hc','fee_pm','fee_lab','fee_ai_cow','fee_ai_buff','fee_other']},
  ]},
  { id:'ai_semen', label:'AI & Semen (Breed-wise)', icon:'🧬', fields:[
      {key:'ai_till_date', label:'AI Till Date (Overall)'},
      {key:'ai_cow_monthly', label:'AI Cow – Monthly'},
      {key:'ai_cow_annual', label:'AI Cow – Annual'},
      {key:'ai_buffalo_monthly', label:'AI Buffalo – Monthly'},
      {key:'ai_buffalo_annual', label:'AI Buffalo – Annual'},
      {key:'followup_cow_monthly', label:'Follow-up Cow – Monthly'},
      {key:'followup_cow_annual', label:'Follow-up Cow – Annual'},
      {key:'followup_buffalo_monthly', label:'Follow-up Buffalo – Monthly'},
      {key:'followup_buffalo_annual', label:'Follow-up Buffalo – Annual'},
  ], matrices:[
            {id:'cattle_semen', title:'Cattle Semen Account', prefix:'cattle', metrics:SEMEN_METRICS, breeds:CATTLE_BREEDS, metricGroups:SEMEN_METRIC_GROUPS,
        rowTotalGroups:[{id:'total_local', label:'Total Local Semen', breedKeys:['hf','jersey','hfc_cb','sahi','pt_sahi','hf_imp','hf_ett','jr_imp','imp_hf']}, {id:'total_sss', label:'Total SSS', breedKeys:['hf250','jr250']}]},
      {id:'buffalo_semen', title:'Buffalo Semen Account', prefix:'buffalo', metrics:SEMEN_METRICS, breeds:BUFFALO_BREEDS, metricGroups:SEMEN_METRIC_GROUPS,
        rowTotalGroups:[{id:'total_local', label:'Total Local', breedKeys:['murrah25','nili25']}, {id:'total_sexed', label:'Total Sexed', breedKeys:['murrah250','nili250']}]},
  ]},
];

let reportId = null;
let currentReport = null;
let currentSections = {};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function getMonthName(month) { return MONTHS[Number(month)-1] || '-'; }
let messageTimer = null;
function showMessage(message, type='info') {
  const el = document.getElementById('message'); if (!el) return;
  if (messageTimer) { clearTimeout(messageTimer); messageTimer = null; }
  el.className = 'message ' + type; el.textContent = message; el.style.display = 'block';
  const hideAfter = (type === 'success') ? 3500 : 3000;
  messageTimer = setTimeout(() => { el.style.display='none'; }, hideAfter);
}
function toggleAccordion(id) { const el=document.getElementById('acc-'+id); if(el) el.classList.toggle('open'); }
function isReadOnly() { return ['Submitted','Verified','Approved','Locked'].includes(String(currentReport?.status || '')); }

async function loadReport() {

  // Get report ID from URL
  const params = new URLSearchParams(window.location.search);

  reportId = params.get('id');

  // Fallback for local file:// URLs
  if (!reportId) {
    const match = window.location.href.match(/[?&]id=([^&#]+)/i);

    if (match) {
      reportId = decodeURIComponent(match[1]);
    }
  }

  console.log("Current URL:", window.location.href);
  console.log("URL Search:", window.location.search);
  console.log("Report ID detected:", reportId);

  if (!reportId) {
    throw new Error(
      'Monthly Report ID is missing from the URL. URL=' +
      window.location.href
    );
  }
  const currentUser = JSON.parse(
  localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null'
);
if (!currentUser) throw new Error('Session expired. Please sign in again.');

  // Load report first. Do not depend on a foreign-key relationship
  // between mpr_reports and institutions for the entry page to work.
  const { data:report, error:reportError } = await supabaseClient
    .from('mpr_reports')
    .select('*')
    .eq('id',reportId)
    .single();

  if (reportError) throw reportError;
  if (!report) throw new Error('Monthly report not found.');

  // Load institution separately using the known V5 institution columns.
  let institution = null;
  if (report.institution_id) {
    const { data:inst, error:instError } = await supabaseClient
      .from('institutions')
      .select('id,institution_code,institution_name,institution_type,block')
      .eq('id', report.institution_id)
      .maybeSingle();

    if (instError) {
      console.warn('Institution lookup warning:', instError);
    } else {
      institution = inst;
    }
  }

  currentReport = { ...report, institutions: institution };

  const { data:rows, error:rowsError } = await supabaseClient.from('mpr_section_data').select('*').eq('report_id',reportId);
  if (rowsError) throw rowsError;
  currentSections = {};
  (rows || []).forEach(row => currentSections[row.section] = row.data || {});
  renderPage();
  document.getElementById('loading').style.display='none';
  console.log('Monthly Report Loaded:', currentReport);
  console.log('Sections Loaded:', Object.keys(currentSections).length);
}

function renderPage() {
  const inst=currentReport.institutions, readOnly=isReadOnly(), status=String(currentReport.status||'Draft');
  document.getElementById('reportHeader').innerHTML = `<div><h1>Monthly Report Entry</h1><div class="subtitle">Punjab Animal Husbandry Department — Fazilka</div></div><div class="status-badge ${status.toLowerCase()}">${esc(status)}</div>`;
  document.getElementById('reportInfo').innerHTML = `
    <div class="info-card"><span>Institution</span><strong>${esc(inst?.institution_code||'')} - ${esc(inst?.institution_name||'Unknown Institution')}</strong></div>
    <div class="info-card"><span>Block</span><strong>${esc(inst?.block||'-')}</strong></div>
    <div class="info-card"><span>Report Period</span><strong>${esc(getMonthName(currentReport.report_month))} ${currentReport.report_year}</strong></div>
    <div class="info-card"><span>Status</span><strong>${esc(status)}</strong></div>`;
  const statusOptions=['Draft','Submitted'].map(s=>`<option value="${s}" ${status===s?'selected':''}>${s}</option>`).join('');
  document.getElementById('statusArea').innerHTML=`<div><label>Status</label><select id="statusSelect" ${readOnly?'disabled':''}>${statusOptions}</select></div><button class="btn secondary" onclick="updateReportStatus()" ${readOnly?'disabled':''}>Update Status</button>`;
  document.getElementById('mprBody').innerHTML=SECTIONS.map(renderSection).join('');
  document.getElementById('backBtn').onclick=()=>location.href='monthly-report.html';
  updateSectionTotal('opd');
  SECTIONS.forEach(sec=>{if(sec.totals) computeSectionTotals(sec.id);});
   SECTIONS.forEach(sec=>{if(sec.matrices) sec.matrices.forEach(m=>computeMatrixTotals(sec.id,m.id));});
  updateAiSemenAnnualFields();
  prefillOpeningBalances();
  prefillAnimalCovered3MonthPrior();
  fetchPrevMonthOpdTotal();
}

function renderSection(sec) {
  const data=currentSections[sec.id]||{}, disabled=isReadOnly()?'disabled':'';
  let speciesHtml='';
  if(sec.speciesTable){
    const headers=OPD_TYPES.map(t=>`<th>${esc(t.label)}</th>`).join('');
    const rows=OPD_SPECIES.map(sp=>`<tr><td class="row-label">${esc(sp.label)}</td>${OPD_TYPES.map(t=>{const key=`${t.key}_${sp.key}`;return `<td><input type="number" min="0" data-key="${key}" value="${data[key]??''}" oninput="updateSectionTotal('opd')" ${disabled}></td>`}).join('')}</tr>`).join('');
    speciesHtml=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Species</th>${headers}</tr></thead><tbody>${rows}<tr class="total-row"><td>Column Total</td>${OPD_TYPES.map(t=>`<td id="coltotal-opd-${t.key}">0</td>`).join('')}</tr></tbody></table></div><div class="field-grid"><div class="field"><label>Grand Total (All OPD)</label><input id="grandtotal-opd" class="readonly" readonly value="0"></div><div class="field"><label>OPD Growth vs Last Month (%)</label><input id="opdgrowth-opd" class="readonly" readonly value="-"></div></div>`;
  }
  let matricesHtml=''; if(sec.matrices) matricesHtml=sec.matrices.map(m=>renderMatrix(sec,m,data,disabled)).join('');
  let fieldsHtml='';
  if(sec.fieldGroups){const map=Object.fromEntries(sec.fields.map(f=>[f.key,f]));fieldsHtml=sec.fieldGroups.map(g=>`<div class="field-group"><h5>${esc(g.title)}</h5><div class="field-grid">${g.keys.map(k=>renderField(map[k],data,disabled,sec.id)).join('')}</div></div>`).join('');}
  else if(sec.fields) fieldsHtml=`<div class="field-grid">${sec.fields.map(f=>renderField(f,data,disabled,sec.id)).join('')}</div>`;
  const totalsHtml=(sec.totals||[]).length?`<div class="totals-grid">${sec.totals.map(t=>`<div class="field"><label>${esc(t.label)}</label><input id="gtotal-${sec.id}-${t.id}" class="readonly" readonly value="0"></div>`).join('')}</div>`:'';
  return `<section class="accordion" id="acc-${sec.id}"><button class="accordion-head" type="button" onclick="toggleAccordion('${sec.id}')"><span>${sec.icon} ${esc(sec.label)}</span><span>▶</span></button><div class="accordion-body">${speciesHtml}${matricesHtml}${fieldsHtml}${totalsHtml}<div class="save-row"><button class="btn" onclick="saveSection('${sec.id}')" ${disabled}>Save Section</button></div></div></section>`;
}
 function renderField(f,data,disabled,sectionId){if(!f)return '';const type=f.type||'number',attrs=type==='number'?'min="0" step="any"':'';const optAttr=f.optional?'data-optional="true"':'';const optLabel=f.optional?' <small style="color:#9ca3af">(optional)</small>':'';return `<div class="field"><label>${esc(f.label)}${optLabel}</label><input type="${type}" ${attrs} data-key="${f.key}" data-type="${type}" ${optAttr} value="${esc(data[f.key]??'')}" oninput="computeSectionTotals('${sectionId}')" ${disabled}></div>`;}
function renderMatrix(sec,m,data,disabled){
  const headers=m.breeds.map(b=>`<th>${esc(b.label)}</th>`).join('')+(m.rowTotalGroups||[]).map(g=>`<th>${esc(g.label)}</th>`).join('');
  const body=m.metrics.map(met=>{const cells=m.breeds.map(b=>{const key=`${m.prefix}_${met.key}_${b.key}`;if(met.computed)return `<td><input id="cell-${sec.id}-${m.id}-${met.key}-${b.key}" data-key="${key}" data-type="computed" class="readonly" readonly value="${data[key]??0}"></td>`;return `<td><input type="number" min="0" step="any" data-key="${key}" value="${data[key]??''}" oninput="computeMatrixTotals('${sec.id}','${m.id}')" ${disabled}></td>`}).join('');const rt=(m.rowTotalGroups||[]).map(g=>`<td id="rtotal-${sec.id}-${m.id}-${g.id}-${met.key}">0</td>`).join('');return `<tr><td class="row-label">${esc(met.label)}${met.computed?' <small>(auto)</small>':''}</td>${cells}${rt}</tr>`}).join('');
  const groupRows=(m.metricGroups||[]).map(grp=>`<tr class="group-total"><td>${esc(grp.label)}</td>${m.breeds.map(b=>`<td id="gtotal-${sec.id}-${m.id}-${grp.id}-${b.key}">0</td>`).join('')}${(m.rowTotalGroups||[]).map(()=>'<td></td>').join('')}</tr>`).join('');
  const grand=(m.metricGroups||[]).map(grp=>`<div class="field"><label>${esc(grp.label)} (Grand)</label><input id="ggrand-${sec.id}-${m.id}-${grp.id}" class="readonly" readonly value="0"></div>`).join('');
  return `<div class="matrix-block"><h4>${esc(m.title)}</h4><div class="table-wrap"><table class="data-table matrix"><thead><tr><th>Metric</th>${headers}</tr></thead><tbody>${body}${groupRows}</tbody></table></div><div class="field-grid">${grand}</div></div>`;
}

function computeMatrixTotals(sectionId, matrixId){
  const sec = SECTIONS.find(s => s.id === sectionId);
  const m = sec.matrices.find(x => x.id === matrixId);
  const item = document.getElementById('acc-'+sectionId);

  const getVal = (metKey, breedKey) => {
    const met = m.metrics.find(x => x.key === metKey);
    if(met && met.computed){
      const el = document.getElementById(`cell-${sectionId}-${matrixId}-${metKey}-${breedKey}`);
      return Number((el && el.value) || 0);
    }
    const inp = item.querySelector(`input[data-key="${m.prefix}_${metKey}_${breedKey}"]`);
    return Number((inp && inp.value) || 0);
  };

  // 1) compute cells in metric order so dependencies (opening_balance+received -> total_monthly -> balance) resolve correctly
  m.breeds.forEach(b => {
    m.metrics.forEach(met => {
      if(!met.computed) return;
      const vals = {};
      m.metrics.forEach(mm => { if(!mm.computed) vals[mm.key] = getVal(mm.key, b.key); });
      // include already-computed earlier metrics too
      m.metrics.forEach(mm => { if(mm.computed && mm.key !== met.key) vals[mm.key] = getVal(mm.key, b.key); });
      const result = met.computed(vals);
      const el = document.getElementById(`cell-${sectionId}-${matrixId}-${met.key}-${b.key}`);
      if(el) el.value = result;
    });
  });

  // 2) row total groups (per metric row, sum across a subset of breeds)
  (m.rowTotalGroups || []).forEach(g => {
    m.metrics.forEach(met => {
      let sum = 0;
      g.breedKeys.forEach(bk => { sum += getVal(met.key, bk); });
      const el = document.getElementById(`rtotal-${sectionId}-${matrixId}-${g.id}-${met.key}`);
      if(el) el.textContent = sum;
    });
  });

  // 3) metric groups (AI / PD / Calf) column totals + grand totals
  (m.metricGroups || []).forEach(grp => {
    let grandForGroup = 0;
    m.breeds.forEach(b => {
      let colSum = 0;
      grp.keys.forEach(k => { colSum += getVal(k, b.key); });
      grandForGroup += colSum;
      const el = document.getElementById(`gtotal-${sectionId}-${matrixId}-${grp.id}-${b.key}`);
      if(el) el.textContent = colSum;
    });
    const grandEl = document.getElementById(`ggrand-${sectionId}-${matrixId}-${grp.id}`);
    if(grandEl) grandEl.value = grandForGroup;
  });

  if(sectionId==='ai_semen'){
    updateAiSemenFees();
    clearTimeout(aiSemenDebounce);
    aiSemenDebounce=setTimeout(()=>{ updateAiSemenAnnualFields(); }, 800);
  }
}

function computeSectionTotals(sectionId){
  const sec = SECTIONS.find(s => s.id === sectionId);
  if(!sec || !sec.totals || !sec.totals.length) return;
  const item = document.getElementById('acc-'+sectionId);
  sec.totals.forEach(t => {
    let sum = 0;
    t.keys.forEach(k => {
      const inp = item.querySelector(`input[data-key="${k}"]`);
      sum += Number((inp && inp.value) || 0);
    });
    const el = document.getElementById(`gtotal-${sectionId}-${t.id}`);
    if(el) el.value = sum;
  });
    if(sectionId==='opd') updateOpdFees();
  if(sectionId==='breeding') updateBreedingFees();
  if(sectionId==='certificates') updateCertificateFees();
}

function updateSectionTotal(sectionId){
  if(sectionId !== 'opd') return;
  const item = document.getElementById('acc-'+sectionId);
  let grand = 0;
  OPD_TYPES.forEach(t => {
    let colSum = 0;
    OPD_SPECIES.forEach(sp => {
      const inp = item.querySelector(`input[data-key="${t.key}_${sp.key}"]`);
      colSum += Number((inp && inp.value) || 0);
    });
    grand += colSum;
    const colEl = document.getElementById(`coltotal-${sectionId}-${t.key}`);
    if(colEl) colEl.textContent = colSum;
  });
  const grandEl = document.getElementById('grandtotal-'+sectionId);
  if(grandEl) grandEl.value = grand;
}

function updateOpdFees(){
  const item=document.getElementById('acc-opd');if(!item)return;
  const newE=Number(item.querySelector('input[data-key="new_opd_e"]')?.value||0);
  const newB=Number(item.querySelector('input[data-key="new_opd_b"]')?.value||0);
  const newSGP=Number(item.querySelector('input[data-key="new_opd_sgp"]')?.value||0);
  const newCD=Number(item.querySelector('input[data-key="new_opd_cd"]')?.value||0);
  const surgMinor=Number(item.querySelector('input[data-key="surgical_minor"]')?.value||0);
  const surgMajor=Number(item.querySelector('input[data-key="surgical_major"]')?.value||0);
  const obsMinor=Number(item.querySelector('input[data-key="obstetrical_minor"]')?.value||0);
  const obsMajor=Number(item.querySelector('input[data-key="obstetrical_major"]')?.value||0);
  const opdFee=((newE+newB+newSGP)*10)+(newCD*50);
  const surgicalFee=(surgMinor*100)+(surgMajor*250);
  const obstetricalFee=(obsMinor*100)+(obsMajor*200);
  const setFee=(key,val)=>{const inp=document.querySelector(`input[data-key="${key}"]`);if(inp){inp.value=val;inp.readOnly=true;inp.classList.add('readonly');}};
    setFee('fee_opd',opdFee);
  setFee('fee_surgical',surgicalFee);
  setFee('fee_obstetrical',obstetricalFee);
  updateFeeGrandTotal();
}

function updateBreedingFees(){
  const item=document.getElementById('acc-breeding');if(!item)return;
  const pdCow=Number(item.querySelector('input[data-key="pd_paid_cow"]')?.value||0);
  const pdBuff=Number(item.querySelector('input[data-key="pd_paid_buff"]')?.value||0);
  const castBovine=Number(item.querySelector('input[data-key="castration_bovine"]')?.value||0);
  const castSGP=Number(item.querySelector('input[data-key="castration_sgp"]')?.value||0);
  const pdFee=(pdCow+pdBuff)*50;
  const castrationFee=(castBovine+castSGP)*50;
  const setFee=(key,val)=>{const inp=document.querySelector(`input[data-key="${key}"]`);if(inp){inp.value=val;inp.readOnly=true;inp.classList.add('readonly');}};
   setFee('fee_pd',pdFee);
  setFee('fee_castration',castrationFee);
  updateFeeGrandTotal();
}
function updateCertificateFees(){
  const item=document.getElementById('acc-certificates');if(!item)return;
  const hcLarge=Number(item.querySelector('input[data-key="hc_large"]')?.value||0);
  const hcSGP=Number(item.querySelector('input[data-key="hc_sgp"]')?.value||0);
  const hcCD=Number(item.querySelector('input[data-key="hc_cd"]')?.value||0);
  const hcPoultrySmall=Number(item.querySelector('input[data-key="hc_poultry_small"]')?.value||0);
  const hcPoultryLarge=Number(item.querySelector('input[data-key="hc_poultry_large"]')?.value||0);
  const pmLarge=Number(item.querySelector('input[data-key="pm_large"]')?.value||0);
  const pmSGP=Number(item.querySelector('input[data-key="pm_sgp"]')?.value||0);
  const pmPoultry=Number(item.querySelector('input[data-key="pm_poultry"]')?.value||0);
  const vlLarge=Number(item.querySelector('input[data-key="vl_large"]')?.value||0);
  const vlSmall=Number(item.querySelector('input[data-key="vl_small"]')?.value||0);
  const vlPet=Number(item.querySelector('input[data-key="vl_pet"]')?.value||0);
  const vlPoultry=Number(item.querySelector('input[data-key="vl_poultry"]')?.value||0);
  const ecBird=Number(item.querySelector('input[data-key="ec_bird"]')?.value||0);

  const hcFee=(hcLarge*100)+(hcSGP*10)+(hcCD*50)+(hcPoultrySmall*50)+(hcPoultryLarge*50);
  const pmFee=(pmLarge*300)+(pmSGP*100)+(pmPoultry*5);
  const vlFee=(vlLarge*300)+(vlSmall*100)+(vlPet*100)+(vlPoultry*5);
  const ecFee=ecBird*2;
  const otherFee=vlFee+ecFee;

  const setFee=(key,val)=>{const inp=document.querySelector(`input[data-key="${key}"]`);if(inp){inp.value=val;inp.readOnly=true;inp.classList.add('readonly');}};
   setFee('fee_hc',hcFee);
  setFee('fee_pm',pmFee);
  setFee('fee_other',otherFee);
  updateFeeGrandTotal();
}
function updateAiSemenFees(){
  const item=document.getElementById('acc-ai_semen');if(!item)return;
  const cattleRates={hf:25,jersey:25,hfc_cb:25,sahi:25,pt_sahi:25,hf_imp:35,hf_ett:35,jr_imp:35,imp_hf:50,hf250:250,jr250:250};
  const buffaloRates={murrah25:25,nili25:25,murrah250:250,nili250:250};
  let cowFee=0;
  Object.keys(cattleRates).forEach(bk=>{
    const inp=item.querySelector(`input[data-key="cattle_ai_during_month_${bk}"]`);
    cowFee += Number(inp?.value||0) * cattleRates[bk];
  });
  let buffFee=0;
  Object.keys(buffaloRates).forEach(bk=>{
    const inp=item.querySelector(`input[data-key="buffalo_ai_during_month_${bk}"]`);
    buffFee += Number(inp?.value||0) * buffaloRates[bk];
  });
  const setFee=(key,val)=>{const inp=document.querySelector(`input[data-key="${key}"]`);if(inp){inp.value=val;inp.readOnly=true;inp.classList.add('readonly');}};
   setFee('fee_ai_cow',cowFee);
  setFee('fee_ai_buff',buffFee);
  updateFeeGrandTotal();
}
let aiSemenDebounce=null;
async function updateAiSemenAnnualFields(){
  const item=document.getElementById('acc-ai_semen');if(!item)return;
  const cattleMonthlyEl=document.getElementById('ggrand-ai_semen-cattle_semen-ai');
  const buffaloMonthlyEl=document.getElementById('ggrand-ai_semen-buffalo_semen-ai');
  const cattlePdMonthlyEl=document.getElementById('ggrand-ai_semen-cattle_semen-pd');
  const buffaloPdMonthlyEl=document.getElementById('ggrand-ai_semen-buffalo_semen-pd');
  const cattleCalfMonthlyEl=document.getElementById('ggrand-ai_semen-cattle_semen-calf');
  const buffaloCalfMonthlyEl=document.getElementById('ggrand-ai_semen-buffalo_semen-calf');
  const cowMonthly=Number(cattleMonthlyEl?.value||0);
  const buffMonthly=Number(buffaloMonthlyEl?.value||0);
  const followupCowMonthly=Number(cattlePdMonthlyEl?.value||0)+Number(cattleCalfMonthlyEl?.value||0);
  const followupBuffMonthly=Number(buffaloPdMonthlyEl?.value||0)+Number(buffaloCalfMonthlyEl?.value||0);
  const setF=(key,val)=>{const inp=item.querySelector(`input[data-key="${key}"]`);if(inp){inp.value=val;inp.readOnly=true;inp.classList.add('readonly');}};
  setF('ai_cow_monthly',cowMonthly);
  setF('ai_buffalo_monthly',buffMonthly);
  setF('followup_cow_monthly',followupCowMonthly);
  setF('followup_buffalo_monthly',followupBuffMonthly);

  if(!currentReport || !currentReport.institution_id) return;
  const curMonth=Number(currentReport.report_month);
  const curYear=Number(currentReport.report_year);
  const fyStartYear = curMonth>=4 ? curYear : curYear-1;

  const { data:pastReports, error } = await supabaseClient
    .from('mpr_reports')
    .select('id, report_month, report_year')
    .eq('institution_id', currentReport.institution_id);
  if(error){ console.error('AI annual fetch error', error); return; }

  const relevant=[];
  (pastReports||[]).forEach(r=>{
    const ry=Number(r.report_year), rm=Number(r.report_month);
    const notFuture = (ry<curYear) || (ry===curYear && rm<=curMonth);
    if(notFuture){
      const inFY = (rm>=4 && ry===fyStartYear) || (rm<=3 && ry===fyStartYear+1);
      relevant.push({id:r.id, inFY});
    }
  });

  let cowAnnual=0, buffAnnual=0, cowTillDate=0, buffTillDate=0, followupCowAnnual=0, followupBuffAnnual=0;
  if(relevant.length){
    const ids=relevant.map(r=>r.id);
    const { data:sectionRows, error:secErr } = await supabaseClient
      .from('mpr_section_data')
      .select('report_id, data')
      .in('report_id', ids)
      .eq('section','ai_semen');
    if(!secErr && sectionRows){
      const fySet=new Set(relevant.filter(r=>r.inFY).map(r=>r.id));
      sectionRows.forEach(row=>{
        const d=row.data||{};
        let cowSum=0, buffSum=0, followupCowSum=0, followupBuffSum=0;
        CATTLE_BREEDS.forEach(b=>{
          cowSum += Number(d[`cattle_ai_during_month_${b.key}`]||0);
          followupCowSum += Number(d[`cattle_pd_positive_${b.key}`]||0) + Number(d[`cattle_male_calf_born_${b.key}`]||0) + Number(d[`cattle_female_calf_born_${b.key}`]||0);
        });
        BUFFALO_BREEDS.forEach(b=>{
          buffSum += Number(d[`buffalo_ai_during_month_${b.key}`]||0);
          followupBuffSum += Number(d[`buffalo_pd_positive_${b.key}`]||0) + Number(d[`buffalo_male_calf_born_${b.key}`]||0) + Number(d[`buffalo_female_calf_born_${b.key}`]||0);
        });
        cowTillDate += cowSum; buffTillDate += buffSum;
        if(fySet.has(row.report_id)){ cowAnnual += cowSum; buffAnnual += buffSum; followupCowAnnual += followupCowSum; followupBuffAnnual += followupBuffSum; }
      });
    }
  }
  setF('ai_cow_annual', cowAnnual);
  setF('ai_buffalo_annual', buffAnnual);
  setF('ai_till_date', cowTillDate+buffTillDate);
  setF('followup_cow_annual', followupCowAnnual);
  setF('followup_buffalo_annual', followupBuffAnnual);
}
async function prefillOpeningBalances(){
  const item=document.getElementById('acc-ai_semen'); if(!item) return;
  if(!currentReport || !currentReport.institution_id) return;
  let curMonth=Number(currentReport.report_month), curYear=Number(currentReport.report_year);
  let prevMonth=curMonth-1, prevYear=curYear;
  if(prevMonth<1){ prevMonth=12; prevYear=curYear-1; }

  const { data:prevReport, error } = await supabaseClient
    .from('mpr_reports')
    .select('id')
    .eq('institution_id', currentReport.institution_id)
    .eq('report_month', prevMonth)
    .eq('report_year', prevYear)
    .maybeSingle();
  if(error || !prevReport) return;

  const { data:sectionRow, error:secErr } = await supabaseClient
    .from('mpr_section_data')
    .select('data')
    .eq('report_id', prevReport.id)
    .eq('section','ai_semen')
    .maybeSingle();
  if(secErr || !sectionRow) return;

  const d=sectionRow.data||{};
  let changed=false;
  CATTLE_BREEDS.forEach(b=>{
    const inp=item.querySelector(`input[data-key="cattle_opening_balance_${b.key}"]`);
    if(inp && inp.value.trim()===''){
      const prevBalance=d[`cattle_balance_${b.key}`];
      if(prevBalance!==undefined){ inp.value=prevBalance; changed=true; }
    }
  });
  BUFFALO_BREEDS.forEach(b=>{
    const inp=item.querySelector(`input[data-key="buffalo_opening_balance_${b.key}"]`);
    if(inp && inp.value.trim()===''){
      const prevBalance=d[`buffalo_balance_${b.key}`];
      if(prevBalance!==undefined){ inp.value=prevBalance; changed=true; }
    }
  });
  if(changed){
    computeMatrixTotals('ai_semen','cattle_semen');
    computeMatrixTotals('ai_semen','buffalo_semen');
  }
}

// =========================================================
// ANIMAL COVERED (3 MONTH PRIOR) — AUTO-FILL
// Pulls each breed's "Animal Covered" value from the report
// exactly 3 calendar months before the current one, and fills
// it into the "Animal Covered (3 Month Prior)" column.
// =========================================================
async function prefillAnimalCovered3MonthPrior(){
  const item=document.getElementById('acc-ai_semen'); if(!item) return;
  if(!currentReport || !currentReport.institution_id) return;
  let curMonth=Number(currentReport.report_month), curYear=Number(currentReport.report_year);
  let prevMonth=curMonth-3, prevYear=curYear;
  if(prevMonth<1){ prevMonth+=12; prevYear-=1; }

  const { data:prevReport, error } = await supabaseClient
    .from('mpr_reports')
    .select('id')
    .eq('institution_id', currentReport.institution_id)
    .eq('report_month', prevMonth)
    .eq('report_year', prevYear)
    .maybeSingle();
  if(error || !prevReport) return;

  const { data:sectionRow, error:secErr } = await supabaseClient
    .from('mpr_section_data')
    .select('data')
    .eq('report_id', prevReport.id)
    .eq('section','ai_semen')
    .maybeSingle();
  if(secErr || !sectionRow) return;

  const d=sectionRow.data||{};
  let changed=false;
  CATTLE_BREEDS.forEach(b=>{
    const inp=item.querySelector(`input[data-key="cattle_animal_covered_3m_prior_${b.key}"]`);
    if(inp && inp.value.trim()===''){
      const priorCovered=d[`cattle_animal_covered_${b.key}`];
      if(priorCovered!==undefined){ inp.value=priorCovered; changed=true; }
    }
  });
  BUFFALO_BREEDS.forEach(b=>{
    const inp=item.querySelector(`input[data-key="buffalo_animal_covered_3m_prior_${b.key}"]`);
    if(inp && inp.value.trim()===''){
      const priorCovered=d[`buffalo_animal_covered_${b.key}`];
      if(priorCovered!==undefined){ inp.value=priorCovered; changed=true; }
    }
  });
  if(changed){
    computeMatrixTotals('ai_semen','cattle_semen');
    computeMatrixTotals('ai_semen','buffalo_semen');
  }
}

// =========================================================
// OPD GROWTH (%) vs LAST MONTH
// =========================================================
let prevMonthOpdTotal = null;

async function fetchPrevMonthOpdTotal(){
  prevMonthOpdTotal = null;
  if(!currentReport || !currentReport.institution_id){ updateOpdGrowth(); return; }

  let curMonth=Number(currentReport.report_month), curYear=Number(currentReport.report_year);
  let prevMonth=curMonth-1, prevYear=curYear;
  if(prevMonth<1){ prevMonth=12; prevYear=curYear-1; }

  const { data:prevReport, error } = await supabaseClient
    .from('mpr_reports')
    .select('id')
    .eq('institution_id', currentReport.institution_id)
    .eq('report_month', prevMonth)
    .eq('report_year', prevYear)
    .maybeSingle();
  if(error || !prevReport){ updateOpdGrowth(); return; }

  const { data:sectionRow, error:secErr } = await supabaseClient
    .from('mpr_section_data')
    .select('data')
    .eq('report_id', prevReport.id)
    .eq('section','opd')
    .maybeSingle();
  if(secErr || !sectionRow){ updateOpdGrowth(); return; }

  const d = sectionRow.data || {};
  let total = 0;
  OPD_TYPES.forEach(t=>{
    OPD_SPECIES.forEach(sp=>{
      total += Number(d[`${t.key}_${sp.key}`] || 0);
    });
  });

  prevMonthOpdTotal = total;
  updateOpdGrowth();
}

function updateOpdGrowth(){
  const el = document.getElementById('opdgrowth-opd');
  if(!el) return;

  const grandEl = document.getElementById('grandtotal-opd');
  const currentTotal = Number(grandEl?.value || 0);

  if(prevMonthOpdTotal === null){
    el.value = '-';
    return;
  }

  if(prevMonthOpdTotal === 0){
    el.value = currentTotal > 0 ? 'New (no data last month)' : '0%';
    return;
  }

  const growth = ((currentTotal - prevMonthOpdTotal) / prevMonthOpdTotal) * 100;
  const sign = growth > 0 ? '+' : '';
  el.value = `${sign}${growth.toFixed(1)}%`;
}

function updateFeeGrandTotal(){
  const keys=['fee_opd','fee_surgical','fee_obstetrical','fee_pd','fee_castration','fee_hc','fee_pm','fee_lab','fee_ai_cow','fee_ai_buff','fee_other'];
  let sum=0;
  keys.forEach(k=>{ const inp=document.querySelector(`input[data-key="${k}"]`); sum += Number(inp?.value||0); });
  const el=document.getElementById('gtotal-fees-fee_grand_total');
  if(el) el.value=sum;
}
function updateSectionTotal(sectionId){if(sectionId!=='opd')return;const item=document.getElementById('acc-opd');if(!item)return;let grand=0;OPD_TYPES.forEach(t=>{let sum=0;OPD_SPECIES.forEach(sp=>{const inp=item.querySelector(`input[data-key="${t.key}_${sp.key}"]`);sum+=Number(inp?.value||0);});document.getElementById(`coltotal-opd-${t.key}`).textContent=sum;grand+=sum;});const g=document.getElementById('grandtotal-opd');if(g)g.value=grand;
  updateOpdFees();
  updateOpdGrowth();
}

async function saveSection(sectionId){
  if(isReadOnly())return;const item=document.getElementById('acc-'+sectionId);if(!item)return;

  // Validation: every editable input must be filled (readonly/computed fields are skipped)
  const inputs=item.querySelectorAll('input[data-key]:not(.readonly):not([readonly]):not([data-optional="true"])');
  let emptyCount=0; let firstEmpty=null;
  inputs.forEach(inp=>{
    if(inp.value.trim()===''){
      emptyCount++;
      inp.classList.add('field-error');
      if(!firstEmpty) firstEmpty=inp;
    } else {
      inp.classList.remove('field-error');
    }
  });
  if(emptyCount>0){
    showMessage('Please fill all fields before saving. '+emptyCount+' field(s) are empty.','error');
    if(firstEmpty) firstEmpty.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }

  const data={};
  item.querySelectorAll('input[data-key]').forEach(inp=>{if(inp.value==='')return;const type=inp.dataset.type||inp.type;data[inp.dataset.key]=(type==='text'||type==='date')?inp.value:Number(inp.value);});
  const {error}=await supabaseClient.from('mpr_section_data').upsert({report_id:reportId,section:sectionId,data,updated_at:new Date().toISOString()},{onConflict:'report_id,section'});
  if(error){console.error('Save Section Error:',error);showMessage('Error saving '+sectionId+': '+error.message,'error');return;}
   currentSections[sectionId]=data;showMessage('Section saved successfully.','success');toggleAccordion(sectionId);
  if(sectionId==='ai_semen') updateAiSemenAnnualFields();
  if(sectionId==='opd') fetchPrevMonthOpdTotal();
}
async function updateReportStatus(){
  if(isReadOnly())return;const status=document.getElementById('statusSelect').value;
  const {error}=await supabaseClient.from('mpr_reports').update({status,updated_at:new Date().toISOString()}).eq('id',reportId);
  if(error){console.error('Status Update Error:',error);showMessage('Status update failed: '+error.message,'error');return;}
  currentReport.status=status;renderPage();showMessage('Report status updated to '+status+'.','success');
}
document.addEventListener('DOMContentLoaded',async()=>{try{console.log('Monthly Report Entry Page Ready'); if(!supabaseClient) throw new Error('Supabase database object is not available.'); await loadReport();}catch(error){console.error('Monthly Report Entry Error:',error);const loading=document.getElementById('loading');if(loading) loading.style.display='none';showMessage(error.message||'Unable to load monthly report.','error');}});