const gridEl = document.getElementById("grid");
const sizeSelect = document.getElementById("sizeSelect");
const heuristicSelect = document.getElementById("heuristicSelect");
const animationToggle = document.getElementById("animationToggle");
const solveBtn = document.getElementById("solveBtn");
const clearPathBtn = document.getElementById("clearPathBtn");
const clearWallsBtn = document.getElementById("clearWallsBtn");
const randomBtn = document.getElementById("randomBtn");

let N = Number(sizeSelect.value);
let cells = [];
let start = {r: 1, c: 1};
let goal = {r: N - 2, c: N - 2};
let drawing = false;
let moving = null;
let running = false;

const key = (r,c) => `${r},${c}`;
const same = (a,b) => a.r === b.r && a.c === b.c;

function buildGrid() {
  N = Number(sizeSelect.value);
  start = {r: 1, c: 1};
  goal = {r: N - 2, c: N - 2};
  cells = Array.from({length:N}, (_,r) =>
    Array.from({length:N}, (_,c) => ({r,c,wall:false}))
  );
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
  for (let r=0;r<N;r++) {
    for (let c=0;c<N;c++) {
      const el = document.createElement("div");
      el.className = "cell";
      el.dataset.r = r; el.dataset.c = c;
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointerenter", onPointerEnter);
      el.addEventListener("pointerup", () => { drawing=false; moving=null; });
      gridEl.appendChild(el);
    }
  }
  render();
  resetStats();
}

function cellEl(r,c) {
  return gridEl.children[r*N+c];
}

function render() {
  for (let r=0;r<N;r++) for (let c=0;c<N;c++) {
    const el = cellEl(r,c);
    el.className = "cell";
    if (cells[r][c].wall) el.classList.add("wall");
    if (same({r,c},start)) el.classList.add("start");
    if (same({r,c},goal)) el.classList.add("goal");
  }
}

function clearSearchVisuals() {
  for (const el of gridEl.children)
    el.classList.remove("visited","path");
}

function onPointerDown(e) {
  if (running) return;
  e.preventDefault();
  const r = +e.currentTarget.dataset.r, c = +e.currentTarget.dataset.c;
  if (same({r,c},start)) moving = "start";
  else if (same({r,c},goal)) moving = "goal";
  else {
    drawing = !cells[r][c].wall;
    cells[r][c].wall = drawing;
    clearSearchVisuals();
    render();
  }
}
function onPointerEnter(e) {
  if (running) return;
  const r = +e.currentTarget.dataset.r, c = +e.currentTarget.dataset.c;
  if (moving) {
    if ((moving==="start" && same({r,c},goal)) || (moving==="goal" && same({r,c},start))) return;
    if (!cells[r][c].wall) {
      if (moving==="start") start={r,c}; else goal={r,c};
      render();
    }
  } else if (drawing && !same({r,c},start) && !same({r,c},goal)) {
    cells[r][c].wall = true;
    render();
  }
}
window.addEventListener("pointerup", () => { drawing=false; moving=null; });

function neighbors(node) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  return dirs.map(([dr,dc]) => ({r:node.r+dr,c:node.c+dc}))
    .filter(p => p.r>=0 && p.r<N && p.c>=0 && p.c<N && !cells[p.r][p.c].wall);
}

function heuristic(a,b) {
  const dr=Math.abs(a.r-b.r), dc=Math.abs(a.c-b.c);
  return heuristicSelect.value === "euclidean" ? Math.hypot(dr,dc) : dr+dc;
}

function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

async function solveAStar() {
  if (running) return;
  running = true; solveBtn.disabled=true;
  clearSearchVisuals();
  setStatus("Searching…"); setStat("visitedStat",0); setStat("pathStat","—");
  const t0 = performance.now();

  const open = [{...start, g:0, f:heuristic(start,goal)}];
  const came = new Map();
  const gScore = new Map([[key(start.r,start.c),0]]);
  const closed = new Set();
  let visited = 0, found = false;

  while (open.length) {
    open.sort((a,b)=>a.f-b.f || a.g-b.g);
    const current = open.shift();
    const ck=key(current.r,current.c);
    if (closed.has(ck)) continue;
    closed.add(ck); visited++;
    if (!same(current,start) && !same(current,goal)) cellEl(current.r,current.c).classList.add("visited");
    setStat("visitedStat",visited);

    if (same(current,goal)) { found=true; break; }

    for (const next of neighbors(current)) {
      const nk=key(next.r,next.c);
      if (closed.has(nk)) continue;
      const tentative = current.g + 1;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, current);
        gScore.set(nk,tentative);
        open.push({...next,g:tentative,f:tentative+heuristic(next,goal)});
      }
    }
    if (animationToggle.checked) await sleep(10);
  }

  if (found) {
    const path=[];
    let cur={...goal};
    while (!same(cur,start)) {
      path.push(cur);
      cur=came.get(key(cur.r,cur.c));
      if (!cur) break;
    }
    path.push(start);
    path.reverse();
    for (const p of path) {
      if (!same(p,start) && !same(p,goal)) {
        cellEl(p.r,p.c).classList.remove("visited");
        cellEl(p.r,p.c).classList.add("path");
      }
      if (animationToggle.checked) await sleep(25);
    }
    setStat("pathStat", `${path.length - 1} steps`);
    setStatus("Path found");
  } else {
    setStatus("Goal unreachable");
  }
  setStat("timeStat", `${Math.round(performance.now()-t0)} ms`);
  running=false; solveBtn.disabled=false;
}

function setStat(id,value){ document.getElementById(id).textContent=value; }
function setStatus(s){ setStat("statusStat",s); }
function resetStats(){ setStat("visitedStat","0");setStat("pathStat","—");setStat("timeStat","0 ms");setStatus("Ready"); }

clearPathBtn.onclick=()=>{ if(!running){clearSearchVisuals();resetStats();} };
clearWallsBtn.onclick=()=>{ if(!running){cells.forEach(row=>row.forEach(x=>x.wall=false));clearSearchVisuals();render();resetStats();} };
randomBtn.onclick=()=>{
  if(running)return;
  cells.forEach(row=>row.forEach(x=>x.wall=Math.random()<0.25));
  cells[start.r][start.c].wall=false; cells[goal.r][goal.c].wall=false;
  clearSearchVisuals();render();resetStats();
};
sizeSelect.onchange=()=>{if(!running)buildGrid();};
solveBtn.onclick=solveAStar;

buildGrid();
