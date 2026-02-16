const STORAGE_KEY = 'life_tracker_v1';
const ITEMS = ['Circuit training','Stretching','Cardio','Health eating'];

function todayKey(d = new Date()){return d.toISOString().slice(0,10)}

function loadAll(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{dates:{}}}catch(e){return {dates:{}}}}
function saveAll(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}

function getDay(state,key){state.dates = state.dates || {}; return state.dates[key] = state.dates[key] || {checklist: ITEMS.map(()=>false), revenue:0, flexibility:null}}

// UI wiring
document.addEventListener('DOMContentLoaded',()=>{
  const state = loadAll();
  const key = todayKey();
  const day = getDay(state,key);

  const checklistEl = document.getElementById('checklist');
  const progressFill = document.getElementById('progressFill');
  const rewardBanner = document.getElementById('rewardBanner');
  const revenueInput = document.getElementById('revenueInput');
  const weeklyTotalEl = document.getElementById('weeklyTotal');
  const flexInput = document.getElementById('flexInput');
  const saveFlex = document.getElementById('saveFlex');
  const saveRevenue = document.getElementById('saveRevenue');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const noteInput = document.getElementById('noteInput');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const notesList = document.getElementById('notesList');

  // render checklist
  function renderChecklist(){
    checklistEl.innerHTML = '';
    day.checklist.forEach((val,i)=>{
      const li = document.createElement('li');
      const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!val; cb.id = 'cb'+i;
      const lbl = document.createElement('label'); lbl.htmlFor = cb.id; lbl.textContent = ITEMS[i]; lbl.style.flex='1';
      cb.addEventListener('change', ()=>{ day.checklist[i]=cb.checked; saveAll(state); updateProgress(); checkReward(); });
      li.appendChild(cb); li.appendChild(lbl);
      checklistEl.appendChild(li);
    })
  }

  function updateProgress(){
    const total = day.checklist.length;
    const done = day.checklist.filter(Boolean).length;
    const pct = Math.round((done/total)*100);
    progressFill.style.width = pct + '%';
  }

  function checkReward(){
    const checklistDone = day.checklist.every(Boolean);
    const businessLogged = (day.revenue||0) > 0;
    if(checklistDone && businessLogged){ rewardBanner.style.display = 'block' } else { rewardBanner.style.display = 'none' }
  }

  // revenue
  revenueInput.value = day.revenue || '';
  saveRevenue.addEventListener('click', ()=>{
    const v = parseFloat(revenueInput.value) || 0; day.revenue = v; saveAll(state); updateWeekly(); checkReward();
  });

  // weekly total
  function getPastKeys(n){
    const out=[]; for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); out.push(todayKey(d)); } return out;
  }
  function updateWeekly(){
    const keys = getPastKeys(7); let sum=0;
    keys.forEach(k=>{ const d = (state.dates&&state.dates[k])||{}; sum += parseFloat(d.revenue||0); });
    weeklyTotalEl.textContent = sum.toFixed(2);
  }

  // splits and chart
  flexInput.value = day.flexibility ?? '';

  const ctx = document.getElementById('splitsChart').getContext('2d');
  const last30 = getPastKeys(30);
  const chart = new Chart(ctx,{
    type:'line',
    data:{labels:last30.map(d=>d.slice(5)),datasets:[{label:'Flexibility (cm)',data:[],borderColor:'#8affff',tension:0.25,fill:false}]},
    options:{scales:{y:{beginAtZero:false}},plugins:{legend:{labels:{color:'#cfeff6'}}}
  }});

  function buildFlexSeries(){
    const keys = last30; const flex=[];
    keys.forEach(k=>{ const d = (state.dates&&state.dates[k])||{}; flex.push(d.flexibility!=null? d.flexibility : null); });
    chart.data.datasets[0].data = flex; chart.update();
  }

  saveFlex.addEventListener('click', ()=>{
    const f = parseFloat(flexInput.value);
    day.flexibility = Number.isFinite(f)? f : null; saveAll(state); buildFlexSeries(); checkReward();
  });

  // quick notes list
  const NOTES_KEY = 'life_notes_list';
  function loadNotes(){try{return JSON.parse(localStorage.getItem(NOTES_KEY))||[]}catch(e){return []}}
  function saveNotes(notes){localStorage.setItem(NOTES_KEY,JSON.stringify(notes))}
  let notes = loadNotes();

  function renderNotes(){
    notesList.innerHTML='';
    notes.forEach((note,idx)=>{
      const li=document.createElement('li');
      li.style.display='flex';li.style.alignItems='center';li.style.justifyContent='space-between';
      const span=document.createElement('span');span.textContent=note;span.style.flex='1';span.style.wordBreak='break-word';
      const deleteBtn=document.createElement('button');deleteBtn.textContent='×';deleteBtn.style.padding='4px 8px';deleteBtn.style.background='#ff6b6b';deleteBtn.style.marginLeft='8px';deleteBtn.style.marginBottom='0';deleteBtn.style.flexShrink='0';
      deleteBtn.addEventListener('click',()=>{notes.splice(idx,1);saveNotes(notes);renderNotes()});
      li.appendChild(span);li.appendChild(deleteBtn);
      notesList.appendChild(li);
    })
  }

  addNoteBtn.addEventListener('click',()=>{
    const text=noteInput.value.trim();
    if(text){notes.push(text);noteInput.value='';saveNotes(notes);renderNotes()}
  });
  noteInput.addEventListener('keypress',(e)=>{if(e.key==='Enter'){addNoteBtn.click()}});
  renderNotes();

  // initial render
  renderChecklist(); updateProgress(); updateWeekly(); buildFlexSeries(); checkReward();

  // clear log button
  clearLogBtn.addEventListener('click', ()=>{
    if(confirm('Clear all notes? This cannot be undone.')){
      quickLogArea.value = '';
      saveNotes('');
    }
  });

  // export data as CSV
  exportBtn.addEventListener('click', ()=>{
    let csv = 'Date,Flexibility (cm),Circuit training,Stretching,Cardio,Health eating,Revenue\n';
    for(const key in state.dates){
      const d = state.dates[key];
      const items = d.checklist.map(v=>v?'✓':'').join(',');
      csv += `${key},${d.flexibility||''},${items},${d.revenue||''}\n`;
    }
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-tracker-backup-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // import data from CSV
  importBtn.addEventListener('click', ()=>{ importFile.click(); });
  importFile.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try{
        const lines = evt.target.result.split('\n').filter(l=>l.trim());
        if(lines.length<1) throw new Error('Empty file');
        lines.shift(); // skip header
        const newDates = {};
        lines.forEach(line=>{
          const [date, flex, ...rest] = line.split(',');
          if(!date) return;
          const revenue = rest[rest.length-1];
          const checklist = rest.slice(0,-1).map(v=>v.trim()==='✓');
          newDates[date] = {checklist, revenue:parseFloat(revenue)||0, flexibility:parseFloat(flex)||null};
        });
        state.dates = newDates;
        saveAll(state);
        location.reload();
      }catch(err){
        alert('Error importing file: '+err.message);
      }
    };
    reader.readAsText(file);
  });

  // clear all data
  clearAllBtn.addEventListener('click', ()=>{
    if(confirm('Clear all data? This cannot be undone.')){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
});
