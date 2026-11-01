const SUPABASE_URL = 'https://luuhganaypvplzbwjvhx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pcWAlIORQvqog-QeWWok1g__2FMpOYS';

if (!window.supabase?.createClient) {
  alert('Impossible de charger Supabase. Vérifiez votre connexion Internet puis rechargez la page.');
  throw new Error('Supabase JS SDK indisponible');
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const KEY='cq_checklist_complete_v1';
const $=id=>document.getElementById(id);
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const examples=[
 {unit:'Biochimie',specialty:'Biochimie générale',analysis:'Glycémie',machine:'Mindray BS-200',levels:['CQ1','CQ2'],active:true},
 {unit:'Biochimie',specialty:'Biochimie générale',analysis:'Urée',machine:'Mindray BS-200',levels:['CQ1','CQ2'],active:true},
 {unit:'Biochimie',specialty:'Biochimie générale',analysis:'Créatinine',machine:'Mindray BS-200',levels:['CQ1','CQ2','CQE'],active:true},
 {unit:'Biochimie',specialty:'Biochimie générale',analysis:'ASAT (TGO)',machine:'Mindray BS-200',levels:['CQ1','CQ2'],active:true},
 {unit:'Biochimie',specialty:'Biochimie générale',analysis:'ALAT (TGP)',machine:'Mindray BS-200',levels:['CQ1','CQ2'],active:true},
 {unit:'Hématologie',specialty:'NFS',analysis:'Contrôle hématologie',machine:'Automate d’hématologie',levels:['CQ1','CQ2'],active:true},
 {unit:'Immunologie',specialty:'Sérologie',analysis:'Contrôle sérologie',machine:'Automate d’immunologie',levels:['CQ1'],active:true}
];
let db;
try{db=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){db=null}
if(!db||!Array.isArray(db.templates)||!Array.isArray(db.records))db={templates:examples.map(x=>({...x,id:uid()})),records:[]};
function persist(){localStorage.setItem(KEY,JSON.stringify(db))}
function currentDate(){return $('workDate').value||today()}
function selectedTemplates(){let unit=$('unitFilter').value,spec=$('specialtyFilter').value;return db.templates.filter(t=>t.active&&(!unit||t.unit===unit)&&(!spec||t.specialty===spec))}
function updateFilters(){
 const oldU=$('unitFilter').value,oldS=$('specialtyFilter').value;
 const units=[...new Set(db.templates.map(t=>t.unit))].sort();
 $('unitFilter').innerHTML='<option value="">Toutes les unités</option>'+units.map(x=>`<option>${escapeHtml(x)}</option>`).join('');
 if(units.includes(oldU))$('unitFilter').value=oldU;
 const unit=$('unitFilter').value;
 const specs=[...new Set(db.templates.filter(t=>!unit||t.unit===unit).map(t=>t.specialty))].sort();
 $('specialtyFilter').innerHTML='<option value="">Toutes les spécialités</option>'+specs.map(x=>`<option>${escapeHtml(x)}</option>`).join('');
 if(specs.includes(oldS))$('specialtyFilter').value=oldS;
 $('histUnit').innerHTML='<option value="">Toutes</option>'+units.map(x=>`<option>${escapeHtml(x)}</option>`).join('');
}
function dayKey(t){return `${currentDate()}|${t.id}`}
function renderDaily(){
 updateFilters();
 const list=selectedTemplates();
 $('dayLabel').textContent=new Date(currentDate()+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
 $('dailyRows').innerHTML=list.length?list.map(t=>{
  const rec=db.records.filter(r=>r.date===currentDate()&&r.templateId===t.id);
  const state={};['CQ1','CQ2','CQE'].forEach(l=>{state[l]=rec.find(r=>r.level===l)||null});
  return `<tr data-template="${t.id}"><td>${escapeHtml(t.unit)}<br><span class="note">${escapeHtml(t.specialty)}</span></td><td><b>${escapeHtml(t.analysis)}</b></td><td>${escapeHtml(t.machine)}</td>
  ${['CQ1','CQ2','CQE'].map(level=>{
   const enabled=t.levels.includes(level),r=state[level];
   return `<td class="checkcell">${enabled?`<input type="checkbox" class="donecheck" data-level="${level}" ${r?'checked':''} aria-label="${level} effectué">`:'—'}</td><td>${enabled?`<select class="result" data-level="${level}"><option value="">Choisir…</option>${['Bon','Pas bon','Recalibration'].map(v=>`<option ${r?.result===v?'selected':''}>${v}</option>`).join('')}</select>`:'—'}</td>`;
  }).join('')}
  <td><input class="remark" placeholder="Lot, valeur, action corrective…" value="${escapeHtml(state.CQ1?.note||state.CQ2?.note||state.CQE?.note||'')}"></td></tr>`;
 }).join(''):'<tr><td colspan="10" class="empty">Aucune analyse active pour ces filtres. Ajoutez des analyses dans Paramètres.</td></tr>';
 updateDailyStats();
}
function updateDailyStats(){
 const trs=[...$('dailyRows').querySelectorAll('tr[data-template]')];let planned=0,saved=0,pending=0,bad=0;
 trs.forEach(tr=>{const t=db.templates.find(x=>x.id===tr.dataset.template);if(!t)return;
  t.levels.forEach(l=>{planned++;const cb=tr.querySelector(`.donecheck[data-level="${l}"]`),sel=tr.querySelector(`.result[data-level="${l}"]`);if(cb?.checked&&sel?.value){saved++;if(sel.value==='Pas bon')bad++}else pending++});
 });
 $('sPlanned').textContent=planned;$('sSaved').textContent=saved;$('sPending').textContent=pending;$('sBad').textContent=bad;
}
async function saveAll(){
 const date=currentDate(),tech=$('technician').value.trim();
 if(!tech){alert('Veuillez saisir le nom du technicien avant l’enregistrement.');$('technician').focus();return}
 let items=[],skipped=0;
 [...$('dailyRows').querySelectorAll('tr[data-template]')].forEach(tr=>{const t=db.templates.find(x=>x.id===tr.dataset.template);if(!t)return;const note=tr.querySelector('.remark')?.value.trim()||'';t.levels.forEach(level=>{const checked=tr.querySelector(`.donecheck[data-level="${level}"]`)?.checked;const result=tr.querySelector(`.result[data-level="${level}"]`)?.value||'';if(!checked||!result){skipped++;return;}items.push({id:uid(),operation_id:uid(),record_date:date,technician:tech,template_id:t.id,unit:t.unit,specialty:t.specialty,analysis:t.analysis,machine:t.machine,level,result,note,created_by:window.cqCurrentUserId||null});});});
 if(!items.length){alert('Aucun contrôle coché avec un résultat choisi.');return;}
 const {data,error}=await supabaseClient.from('cq_records').insert(items).select('*');
 if(error){alert('Erreur Supabase : '+error.message+'\nVérifiez le script SQL et les droits RLS.');return;}
 (data||[]).forEach(r=>db.records.unshift({id:r.id,operationId:r.operation_id,date:r.record_date,technician:r.technician,templateId:r.template_id,unit:r.unit,specialty:r.specialty,analysis:r.analysis,machine:r.machine,level:r.level,result:r.result,note:r.note||'',updatedAt:r.created_at}));persist();renderDaily();renderDashboard();renderHistory();
 alert(`${(data||[]).length} contrôle(s) enregistré(s) dans Supabase.${skipped?` ${skipped} niveau(x) ignoré(s).`:''}`);
}
function resultClass(v){return v==='Bon'?'good':v==='Pas bon'?'bad':v==='Recalibration'?'warn':'neutral'}
function renderDashboard(){
 const rows=db.records.filter(r=>r.date===currentDate());
 $('dTotal').textContent=rows.length;$('dGood').textContent=rows.filter(r=>r.result==='Bon').length;$('dBad').textContent=rows.filter(r=>r.result==='Pas bon').length;$('dRecal').textContent=rows.filter(r=>r.result==='Recalibration').length;
 $('dashboardRows').innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.unit)}</td><td>${escapeHtml(r.specialty)}</td><td>${escapeHtml(r.analysis)}</td><td>${escapeHtml(r.machine)}</td><td>${escapeHtml(r.level)}</td><td><span class="status ${resultClass(r.result)}">${escapeHtml(r.result)}</span></td><td>${escapeHtml(r.technician)}</td><td>${escapeHtml(r.note||'—')}</td></tr>`).join(''):'<tr><td colspan="9" class="empty">Aucun contrôle enregistré pour cette date.</td></tr>';
 const units=[...new Set(rows.map(r=>r.unit))];
 $('unitSummary').innerHTML=units.length?units.map(u=>{const ur=rows.filter(r=>r.unit===u),good=ur.filter(r=>r.result==='Bon').length,percent=Math.round(good/ur.length*100);return `<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:5px"><strong>${escapeHtml(u)}</strong><span class="note">${good}/${ur.length} conformes</span></div><div style="height:9px;border-radius:9px;background:#e8eef5;overflow:hidden"><div style="height:100%;width:${percent}%;background:linear-gradient(90deg,#168477,#22a06b);border-radius:9px"></div></div></div>`}).join(''):'<p class="note">Aucun contrôle enregistré pour cette date.</p>';
 const total=rows.length,good=rows.filter(r=>r.result==='Bon').length,bad=rows.filter(r=>r.result==='Pas bon').length,recal=rows.filter(r=>r.result==='Recalibration').length,conformity=total?Math.round(good/total*100):0;
 $('qualitySummary').innerHTML=total?`<div style="font-size:30px;font-weight:800;color:#18794e">${conformity}%</div><p class="note">Résultats enregistrés classés « Bon »</p><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="status good">Bon : ${good}</span><span class="status bad">Pas bon : ${bad}</span><span class="status warn">Recalibration : ${recal}</span></div>`:'<p class="note">Aucun résultat disponible pour calculer les indicateurs.</p>';
}
function renderHistory(){
 const date=$('histDate').value,term=$('histSearch').value.toLowerCase().trim(),result=$('histResult').value,unit=$('histUnit').value;
 const rows=[...db.records].filter(r=>(!date||r.date===date)&&(!term||(r.analysis+' '+r.machine+' '+r.technician).toLowerCase().includes(term))&&(!result||r.result===result)&&(!unit||r.unit===unit)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 $('historyRows').innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.unit)}</td><td>${escapeHtml(r.specialty)}</td><td>${escapeHtml(r.analysis)}</td><td>${escapeHtml(r.machine)}</td><td>${escapeHtml(r.level)}</td><td><span class="status ${resultClass(r.result)}">${escapeHtml(r.result)}</span></td><td>${escapeHtml(r.technician)}</td><td>${escapeHtml(r.note||'—')}</td><td class="no-print"><button class="danger" onclick="deleteRecord('${r.id}')">Supprimer</button></td></tr>`).join(''):'<tr><td colspan="10" class="empty">Aucun résultat.</td></tr>';
 $('historyCount').textContent=`${rows.length} enregistrement(s) affiché(s) sur ${db.records.length}.`;
}
function renderTemplates(){
 $('templateRows').innerHTML=db.templates.length?db.templates.map(t=>`<tr><td>${escapeHtml(t.unit)}</td><td>${escapeHtml(t.specialty)}</td><td>${escapeHtml(t.analysis)}</td><td>${escapeHtml(t.machine)}</td><td>${escapeHtml(t.levels.join(', '))}</td><td><span class="status ${t.active?'good':'neutral'}">${t.active?'Actif':'Inactif'}</span></td><td><button class="secondary" onclick="toggleTemplate('${t.id}')">${t.active?'Désactiver':'Activer'}</button> <button class="danger" onclick="deleteTemplate('${t.id}')">Supprimer</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">Aucune analyse enregistrée.</td></tr>';
}
async function deleteRecord(id){if(!confirm('Supprimer cet enregistrement ?'))return;const {error}=await supabaseClient.from('cq_records').delete().eq('id',id);if(error){alert('Suppression impossible : '+error.message);return;}db.records=db.records.filter(r=>r.id!==id);persist();renderDaily();renderDashboard();renderHistory()}
async function toggleTemplate(id){const t=db.templates.find(t=>t.id===id);if(!t)return;const active=!t.active;const {error}=await supabaseClient.from('cq_templates').update({active}).eq('id',id);if(error){alert('Modification impossible : '+error.message);return;}t.active=active;persist();renderTemplates();renderDaily()}
async function deleteTemplate(id){if(!confirm('Supprimer cette analyse de la liste ? Les enregistrements historiques seront conservés.'))return;const {error}=await supabaseClient.from('cq_templates').delete().eq('id',id);if(error){alert('Suppression impossible : '+error.message);return;}db.templates=db.templates.filter(t=>t.id!==id);persist();updateFilters();renderTemplates();renderDaily()}
function exportCsv(){
 const date=$('histDate').value,term=$('histSearch').value.toLowerCase().trim(),result=$('histResult').value,unit=$('histUnit').value;
 const rows=db.records.filter(r=>(!date||r.date===date)&&(!term||(r.analysis+' '+r.machine+' '+r.technician).toLowerCase().includes(term))&&(!result||r.result===result)&&(!unit||r.unit===unit));
 const cols=['date','unit','specialty','analysis','machine','level','result','technician','note'];
 const csv=[cols.join(';'),...rows.map(r=>cols.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(';'))].join('\r\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='historique_CQ.csv';a.click();URL.revokeObjectURL(url);
}
function switchTab(id){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));if(id==='dashboard')renderDashboard();if(id==='history')renderHistory();if(id==='settings')renderTemplates()}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
$('workDate').value=today();
$('loadDay').addEventListener('click',()=>{renderDaily();renderDashboard()});
$('unitFilter').addEventListener('change',()=>{updateFilters();renderDaily()});
$('specialtyFilter').addEventListener('change',renderDaily);
$('dailyRows').addEventListener('change',updateDailyStats);
$('dailyRows').addEventListener('input',updateDailyStats);
$('saveAll').addEventListener('click',saveAll);
$('selectAll').addEventListener('click',()=>{$('dailyRows').querySelectorAll('.donecheck').forEach(c=>c.checked=true);updateDailyStats()});
$('clearChecks').addEventListener('click',()=>{$('dailyRows').querySelectorAll('.donecheck').forEach(c=>c.checked=false);updateDailyStats()});
$('markGood').addEventListener('click',()=>{$('dailyRows').querySelectorAll('tr[data-template]').forEach(tr=>{if([...tr.querySelectorAll('.donecheck')].some(c=>c.checked))tr.querySelectorAll('.result').forEach(s=>{if(tr.querySelector(`.donecheck[data-level="${s.dataset.level}"]`)?.checked)s.value='Bon'})});updateDailyStats()});
$('printBtn').addEventListener('click',()=>window.print());$('printHistory').addEventListener('click',()=>window.print());
$('dashboardRefresh').addEventListener('click',renderDashboard);
$('histDate').addEventListener('change',renderHistory);$('histSearch').addEventListener('input',renderHistory);$('histResult').addEventListener('change',renderHistory);$('histUnit').addEventListener('change',renderHistory);
$('clearFilters').addEventListener('click',()=>{$('histDate').value='';$('histSearch').value='';$('histResult').value='';$('histUnit').value='';renderHistory()});
$('exportCsv').addEventListener('click',exportCsv);
$('templateForm').addEventListener('submit',async e=>{e.preventDefault();const t={id:uid(),unit:$('tUnit').value.trim(),specialty:$('tSpecialty').value.trim(),analysis:$('tAnalysis').value.trim(),machine:$('tMachine').value.trim(),levels:$('tLevels').value.split(','),active:$('tActive').value==='yes',created_by:window.cqCurrentUserId||null};const {data,error}=await supabaseClient.from('cq_templates').insert(t).select('*').single();if(error){alert('Ajout impossible : '+error.message);return;}db.templates.push({id:data.id,unit:data.unit,specialty:data.specialty,analysis:data.analysis,machine:data.machine,levels:data.levels,active:data.active});persist();e.target.reset();updateFilters();renderTemplates();renderDaily();alert('Analyse ajoutée dans Supabase.')});
$('addTemplate').addEventListener('click',()=>switchTab('settings'));
$('restoreExamples').addEventListener('click',async()=>{if(!confirm('Ajouter les exemples de démonstration à la liste actuelle ?'))return;const missing=examples.filter(x=>!db.templates.some(t=>t.unit===x.unit&&t.analysis===x.analysis&&t.machine===x.machine)).map(x=>({...x,id:uid(),created_by:window.cqCurrentUserId||null}));if(!missing.length){alert('Les exemples existent déjà.');return;}const {data,error}=await supabaseClient.from('cq_templates').insert(missing).select('*');if(error){alert('Ajout impossible : '+error.message);return;}(data||[]).forEach(t=>db.templates.push(t));persist();updateFilters();renderTemplates();renderDaily()});
$('clearRecords').addEventListener('click',async()=>{if(!confirm('Attention : effacer définitivement tout l’historique CQ partagé ?'))return;const {error}=await supabaseClient.from('cq_records').delete().not('id','is',null);if(error){alert('Effacement impossible : '+error.message);return;}db.records=[];persist();renderDaily();renderDashboard();renderHistory();alert('Historique Supabase effacé.')});
updateFilters();renderDaily();renderDashboard();renderHistory();renderTemplates();persist();

(function(){
 const $a=id=>document.getElementById(id);
 let activeUser=null, profile=null;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function message(text,type='error'){ $a('authMessage').innerHTML=`<div class="${type==='success'?'auth-success':'auth-error'}">${text}</div>`; }
 function switchAuth(mode){const login=mode==='login';$a('loginForm').classList.toggle('hidden',!login);$a('registerForm').classList.toggle('hidden',login);$a('authTitle').textContent=login?'Connexion':'Créer un compte';$a('authSubtitle').textContent=login?'Connectez-vous avec labo@123 (responsable) ou votre adresse e-mail.':'Votre demande sera envoyée au responsable pour activation.';$a('showLogin').className=login?'primary':'secondary';$a('showRegister').className=login?'secondary':'primary';$a('authMessage').innerHTML='';}
 function showAdminPanel(){const yes=profile?.role==='admin'&&profile?.status==='active';$a('employeeAdminPanel').style.display=yes?'block':'none';document.body.classList.toggle('is-admin',yes);}
 async function loadRemoteData(){
  const [{data:templates,error:te},{data:records,error:re}]=await Promise.all([
   supabaseClient.from('cq_templates').select('*').order('unit').order('specialty').order('analysis'),
   supabaseClient.from('cq_records').select('*').order('created_at',{ascending:false})
  ]);
  if(te) throw new Error('Chargement des analyses impossible : '+te.message);
  if(re) throw new Error('Chargement de l’historique impossible : '+re.message);
  db.templates=(templates||[]).map(t=>({id:t.id,unit:t.unit,specialty:t.specialty,analysis:t.analysis,machine:t.machine,levels:t.levels||['CQ1','CQ2'],active:t.active}));
  db.records=(records||[]).map(r=>({id:r.id,operationId:r.operation_id||r.id,date:r.record_date,technician:r.technician,templateId:r.template_id,unit:r.unit,specialty:r.specialty,analysis:r.analysis,machine:r.machine,level:r.level,result:r.result,note:r.note||'',updatedAt:r.created_at}));
  persist(); updateFilters(); renderDaily(); renderDashboard(); renderHistory(); renderTemplates();
  if(!db.templates.length&&profile.role==='admin'){
   const seed=examples.map(t=>({id:uid(),unit:t.unit,specialty:t.specialty,analysis:t.analysis,machine:t.machine,levels:t.levels,active:true}));
   const {error}=await supabaseClient.from('cq_templates').insert(seed.map(t=>({...t,created_by:activeUser.id})));
   if(!error) await loadRemoteData();
  }
 }
 async function renderUserAdmin(){
  if(profile?.role!=='admin')return;
  const {data:users,error}=await supabaseClient.from('cq_profiles').select('id,first_name,last_name,email,role,status,created_at').order('created_at',{ascending:false});
  if(error){$a('pendingUsers').innerHTML='<p class="note">Erreur de lecture des comptes : '+esc(error.message)+'</p>';return;}
  const pending=(users||[]).filter(u=>u.role==='employee'&&u.status==='pending');
  const approved=(users||[]).filter(u=>u.role==='employee'&&u.status==='active');
  $a('pendingCount').textContent=`${pending.length} demande(s) en attente`;
  $a('pendingUsers').innerHTML=pending.length?pending.map(u=>`<div class="admin-user-card"><div><strong>${esc(u.first_name)} ${esc(u.last_name)}</strong><small>${esc(u.email)} · ${esc((u.created_at||'').slice(0,10))}</small></div><div class="actions" style="margin:0"><button class="success" data-approve="${u.id}">Activer le compte</button><button class="danger" data-reject="${u.id}">Refuser</button></div></div>`).join(''):'<p class="note">Aucune demande en attente.</p>';
  $a('approvedUsers').innerHTML=approved.length?approved.map(u=>`<div class="admin-user-card"><div><strong>${esc(u.first_name)} ${esc(u.last_name)}</strong><small>${esc(u.email)} · Compte actif</small></div><button class="danger" data-disable="${u.id}">Désactiver</button></div>`).join(''):'<p class="note">Aucun compte employé actif.</p>';
 }
 async function enter(user){
  const {data:p,error}=await supabaseClient.from('cq_profiles').select('*').eq('id',user.id).single();
  if(error||!p){message('Profil introuvable. Vérifiez le script SQL et la table cq_profiles.');await supabaseClient.auth.signOut();return;}
  if(p.status!=='active'){message(p.status==='pending'?'Votre compte attend l’approbation du responsable.':'Ce compte n’est pas actif.');await supabaseClient.auth.signOut();return;}
  activeUser=user;profile=p;window.cqCurrentUserId=user.id;document.body.classList.add('authenticated');$a('signedInName').textContent=`${p.first_name||''} ${p.last_name||''}`;$a('signedInRole').textContent=p.role==='admin'?'Responsable':'Employé';$a('technician').value=`${p.first_name||''} ${p.last_name||''}`;showAdminPanel();
  try{await loadRemoteData();if(p.role==='admin')await renderUserAdmin();}catch(err){message(esc(err.message));document.body.classList.remove('authenticated');}
 }
 async function logout(){activeUser=null;profile=null;document.body.classList.remove('authenticated','is-admin');await supabaseClient.auth.signOut();switchAuth('login');}
 $a('showLogin').addEventListener('click',()=>switchAuth('login'));$a('showRegister').addEventListener('click',()=>switchAuth('register'));
 $a('loginForm').addEventListener('submit',async e=>{e.preventDefault();const entered=$a('loginUser').value.trim(),password=$a('loginPass').value;const email=entered.toLowerCase()==='labo@123'?'labo.bouzenoune.stage@gmail.com':entered.toLowerCase();if(!email.includes('@')){message('Saisissez labo@123 ou une adresse e-mail valide.');return;}const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){message('Connexion impossible : '+esc(error.message));return;}await enter(data.user);});
 $a('registerForm').addEventListener('submit',async e=>{e.preventDefault();const first_name=$a('regFirst').value.trim(),last_name=$a('regLast').value.trim(),email=$a('regEmail').value.trim().toLowerCase(),password=$a('regPass').value;if(password.length<8){message('Le mot de passe doit contenir au moins 8 caractères.');return;}const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{first_name,last_name}}});if(error){message('Inscription impossible : '+esc(error.message));return;}if(data.session){await supabaseClient.auth.signOut();}$a('registerForm').reset();message('Demande envoyée. Le responsable doit activer votre compte dans le tableau de bord.','success');});
 $a('logoutBtn').addEventListener('click',logout);
 $a('adminAddEmployee').addEventListener('click',()=>alert('Pour créer un compte, l’employé doit utiliser « Créer un compte », puis le responsable valide la demande ici.'));
 $a('employeeAdminPanel').addEventListener('click',async e=>{if(profile?.role!=='admin')return;const id=e.target.dataset.approve||e.target.dataset.reject||e.target.dataset.disable;if(!id)return;
  if(e.target.dataset.reject&& !confirm('Refuser cette demande ?'))return;if(e.target.dataset.disable&&!confirm('Désactiver ce compte ?'))return;
  const status=e.target.dataset.approve?'active':e.target.dataset.reject?'rejected':'disabled';const {error}=await supabaseClient.from('cq_profiles').update({status}).eq('id',id);if(error){alert('Échec de mise à jour : '+error.message);return;}await renderUserAdmin();
 });
 supabaseClient.auth.getSession().then(async ({data})=>{if(data.session)await enter(data.session.user);else switchAuth('login');});
 switchAuth('login');
})();
