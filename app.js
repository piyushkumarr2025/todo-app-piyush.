/* same JS as v2 build with new keys and title already handled there */
(function(){
  const $ = (s,ctx=document)=>ctx.querySelector(s);
  const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));
  const STORAGE_KEY = "todo.piyush.pro.v2"; // keeping the key name (no visible title impact)
  const THEME_KEY = "todo.theme.v2";

  let state = load();
  let currentFilter = "all";

  const els = {
    form: $("#task-form"),
    title: $("#task-input"),
    cat: $("#task-category"),
    prio: $("#task-priority"),
    date: $("#task-date"),
    list: $("#task-list"),
    counts: $("#counts"),
    clearCompleted: $("#clear-completed"),
    exportBtn: $("#export-json"),
    importBtn: $("#import-json"),
    importFile: $("#import-file"),
    chips: $$(".chip"),
    search: $("#search"),
    sortBy: $("#sort-by"),
    template: $("#task-item-template"),
    statOverdue: $("#stat-overdue .kpi"),
    statToday: $("#stat-today .kpi"),
    statCompleted: $("#stat-completed .kpi"),
    themeToggle: $("#theme-toggle")
  };

  initTheme();
  function initTheme(){
    const t = localStorage.getItem(THEME_KEY) || "dark";
    if(t === "light") document.documentElement.classList.add("light");
    updateThemeIcon();
    els.themeToggle.addEventListener("click", ()=>{
      document.documentElement.classList.toggle("light");
      const isLight = document.documentElement.classList.contains("light");
      localStorage.setItem(THEME_KEY, isLight ? "light":"dark");
      updateThemeIcon();
    });
  }
  function updateThemeIcon(){
    els.themeToggle.textContent = document.documentElement.classList.contains("light") ? "🌞" : "🌙";
  }

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function load(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { tasks: [] }; }
    catch(e){ return { tasks: [] }; }
  }
  function uid(){ return Math.random().toString(36).slice(2,9) }
  function nowISO(){ return new Date().toISOString() }
  function parseDate(s){ if(!s) return null; return new Date(s.length===10?s+'T00:00:00':s); }
  function isOverdue(t){
    if(!t.due) return false;
    const d = parseDate(t.due);
    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return !t.completed && d < todayMid;
  }
  function isDueToday(t){
    if(!t.due) return false;
    const d = parseDate(t.due);
    const now = new Date();
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  }

  function counts(){
    const total = state.tasks.length;
    const completed = state.tasks.filter(t=>t.completed).length;
    const active = total - completed;
    els.counts.textContent = `${total} total • ${active} active • ${completed} completed`;
    els.statCompleted.textContent = completed;
    els.statOverdue.textContent = state.tasks.filter(isOverdue).length;
    els.statToday.textContent = state.tasks.filter(isDueToday).length;
  }

  function render(){
    els.list.innerHTML = "";
    const q = els.search.value.trim().toLowerCase();
    let items = state.tasks.filter(t=>{
      if(currentFilter==="active" && t.completed) return false;
      if(currentFilter==="completed" && !t.completed) return false;
      if(currentFilter==="overdue" && !isOverdue(t)) return false;
      if(q && !(t.title+" "+(t.category||"")).toLowerCase().includes(q)) return false;
      return true;
    });

    const mode = els.sortBy.value;
    const prioRank = {high:0, medium:1, low:2};
    items.sort((a,b)=>{
      switch(mode){
        case "created_desc": return b.created.localeCompare(a.created);
        case "due_asc": return (a.due||"").localeCompare(b.due||"");
        case "due_desc": return (b.due||"").localeCompare(a.due||"");
        case "priority": return prioRank[a.priority]-prioRank[b.priority] || a.title.localeCompare(b.title);
        case "title": return a.title.localeCompare(b.title);
        default: return a.created.localeCompare(b.created);
      }
    });

    items.forEach(addTaskElement);
    counts();
  }

  function addTaskElement(task){
    const li = els.template.content.firstElementChild.cloneNode(true);
    li.dataset.id = task.id;
    if(task.completed) li.classList.add("completed");
    if(isOverdue(task)) li.classList.add("overdue");

    $(".toggle", li).checked = task.completed;
    const badge = $(".priority-badge", li);
    const label = task.priority==="high"?"HIGH":task.priority==="low"?"LOW":"MED";
    badge.textContent = label;
    badge.classList.remove("priority-high","priority-medium","priority-low");
    badge.classList.add(task.priority==="high"?"priority-high": task.priority==="low"?"priority-low":"priority-medium");

    $(".task-title", li).textContent = task.title;
    $(".cat", li).textContent = task.category ? task.category : "";
    $(".due", li).textContent = task.due ? `Due: ${new Date(task.due).toLocaleDateString()}` : "";
    $(".ts", li).textContent = `Added: ${new Date(task.created).toLocaleString()}`;

    $(".toggle", li).addEventListener("change", () => toggle(task.id));
    $(".delete", li).addEventListener("click", () => remove(task.id));
    $(".edit", li).addEventListener("click", () => edit(task.id));
    $(".task-title", li).addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); edit(task.id); } });
    els.list.appendChild(li);
  }

  function add(title, due, priority, category){
    state.tasks.push({ id: uid(), title: title.trim(), due: due || "", completed:false, created: nowISO(), priority: priority||"medium", category: category||"" });
    save(); render();
  }
  function toggle(id){
    const t = state.tasks.find(x=>x.id===id);
    if(!t) return;
    t.completed = !t.completed;
    save(); render();
  }
  function remove(id){
    state.tasks = state.tasks.filter(x=>x.id!==id);
    save(); render();
  }
  function edit(id){
    const t = state.tasks.find(x=>x.id===id);
    if(!t) return;
    const title = prompt("Update task title:", t.title);
    if(title===null) return;
    const category = prompt("Update category (optional):", t.category||"");
    const due = prompt("Update due date (YYYY-MM-DD) or leave blank:", t.due||"");
    const prio = prompt("Priority (high/medium/low):", t.priority||"medium");
    t.title = title.trim() || t.title;
    t.category = (category||"").trim();
    t.due = (due||"").trim();
    t.priority = (/^(high|medium|low)$/i.test(prio||"") ? prio.toLowerCase() : t.priority);
    save(); render();
  }

  els.form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const title = els.title.value.trim();
    if(!title) return;
    add(title, els.date.value, els.prio.value, els.cat.value.trim());
    els.title.value = ""; els.cat.value = ""; els.date.value = ""; els.prio.value = "medium";
  });

  els.clearCompleted.addEventListener("click", ()=>{
    state.tasks = state.tasks.filter(t=>!t.completed);
    save(); render();
  });

  els.exportBtn.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="todo-data-v2.json"; a.click(); URL.revokeObjectURL(url);
  });

  els.importBtn.addEventListener("click", ()=> els.importFile.click());
  els.importFile.addEventListener("change", (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if(!data.tasks) throw new Error("Invalid file");
        state = data; save(); render();
      }catch{ alert("Import failed. Use a valid JSON export."); }
    };
    reader.readAsText(file);
  });

  els.chips.forEach(ch => ch.addEventListener("click", ()=>{
    els.chips.forEach(c=>c.classList.remove("active"));
    ch.classList.add("active");
    currentFilter = ch.dataset.filter;
    render();
  }));

  els.search.addEventListener("input", render);
  els.sortBy.addEventListener("change", render);

  render();
})();