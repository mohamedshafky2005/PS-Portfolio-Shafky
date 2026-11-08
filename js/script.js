const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];
const lectures = window.PORTFOLIO_LECTURES || [];
const team = window.TEAM_MEMBERS || [];
const profile = window.PROFILE || {};

function escapeHtml(str=''){ return String(str).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===========================================================
   PROFILE — fills name / initials / program etc. from js/data.js
=========================================================== */
function applyProfile(){
  $$('[data-profile]').forEach(el => {
    const v = profile[el.dataset.profile];
    if(v) el.textContent = v;
  });
  if(profile.name) document.title = `${profile.name} | Professional Skills Portfolio`;

  const photoTile = $('#profilePhoto');
  if(photoTile && profile.photo){
    photoTile.innerHTML = `<img src="${escapeHtml(profile.photo)}" alt="Portrait of ${escapeHtml(profile.name || 'me')}" />`;
  }

  if(profile.cvPdf){
    const dl = $('#cvDownload'), view = $('#cvView'), frame = $('#cvFrame');
    if(view) view.href = profile.cvPdf;
    if(dl){ dl.href = profile.cvPdf; dl.setAttribute('download', profile.cvDownloadName || 'CV.pdf'); }
    if(frame) frame.src = `${profile.cvPdf}#view=FitH`;
  }else{
    $('#cv')?.remove();
    $('.rail-nav a[data-sec="cv"]')?.remove();
  }
}

/* ===========================================================
   THEME
=========================================================== */
function initTheme(){
  const btn = $('#themeToggle'); const root = document.documentElement;
  const sync = () => btn?.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'light');
  sync();
  btn?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch(e) {}
    sync();
  });
}

/* ===========================================================
   LECTURE GRID + FILTERS
=========================================================== */
function renderLectureGrid(){
  const grid = $('#lectureGrid'); const filters = $('#filterRow'); const dots = $('#pathDots');
  if(!grid || !filters) return;

  const areas = ['All', ...new Set(lectures.map(l => l.area))];
  filters.innerHTML = areas.map((a,i)=>`<button type="button" class="${i===0?'active':''}" data-filter="${escapeHtml(a)}" aria-pressed="${i===0}">${escapeHtml(a)}</button>`).join('');

  grid.innerHTML = lectures.map(l => `
    <li data-num="${l.num}">
      <button type="button" class="lcard" data-open-lecture="${l.num}" aria-label="Open lecture ${l.num}: ${escapeHtml(l.title)}">
        <div class="lcard-top">
          <span class="lcard-num" aria-hidden="true">${l.num}</span>
          <span class="chip">${escapeHtml(l.tag)}</span>
        </div>
        <h3>${escapeHtml(l.title)}</h3>
        <p>${escapeHtml(l.intro)}</p>
        <span class="lcard-foot mono"><span>Open entry</span><span class="arrow" aria-hidden="true">→</span></span>
      </button>
    </li>`).join('');

  if(dots) dots.innerHTML = lectures.map(l => `<button type="button" data-open-lecture="${l.num}" aria-label="Open lecture ${l.num}" title="${escapeHtml(l.title)}">${l.num}</button>`).join('');

  filterLectures();
}

function filterLectures(){
  const q = ($('#lectureSearch')?.value || '').toLowerCase().trim();
  const active = $('#filterRow button.active')?.dataset.filter || 'All';
  let shown = 0;
  $$('#lectureGrid li').forEach(li => {
    const l = lectures.find(x => x.num === li.dataset.num);
    const match = (active === 'All' || l.area === active) && (!q || JSON.stringify(l).toLowerCase().includes(q));
    li.hidden = !match;
    if(match) shown++;
  });
  const count = $('#resultCount'); if(count) count.textContent = `Showing ${shown} of ${lectures.length} entries`;
  const empty = $('#lectureEmpty'); if(empty) empty.hidden = shown !== 0;
}

/* ===========================================================
   LECTURE READER (slide-over dialog)
=========================================================== */
const drawer = $('#lectureDrawer');
let currentIndex = -1;

function lectureTemplate(l, index){
  const next = lectures[index + 1];
  return `
    <div class="d-hero">
      <div class="d-meta"><span class="chip">${escapeHtml(l.tag)}</span><span class="chip">${escapeHtml(l.short)}</span></div>
      <p class="d-num" aria-hidden="true">${l.num}</p>
      <h3 id="drawerTitle">${escapeHtml(l.title)}</h3>
      <blockquote>&ldquo;${escapeHtml(l.quote)}&rdquo;${l.quoteBy ? `<cite>${escapeHtml(l.quoteBy)}</cite>` : ''}</blockquote>
    </div>

    <section class="d-block"><h4>Lecture focus</h4><p>${escapeHtml(l.intro)}</p></section>
    <section class="d-block"><h4>Details from slides</h4><div class="chips">${l.slide_focus.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div></section>
    <section class="d-block"><h4>Key concepts</h4><ol class="concepts">${l.core.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol></section>

    ${l.activity ? `<section class="d-block"><h4>${escapeHtml(l.activity.title)}</h4><p>${escapeHtml(l.activity.text)}</p></section>` : ''}

    <div class="d-grid">
      <div class="d-card"><h4>What I learned</h4><p>${escapeHtml(l.learned)}</p></div>
      <div class="d-card"><h4>My learning experience</h4><p>${escapeHtml(l.experience)}</p></div>
      <div class="d-card"><h4>Soft skills developed</h4><p>${escapeHtml(l.soft)}</p></div>
      <div class="d-card"><h4>Real-life application</h4><p>${escapeHtml(l.application)}</p></div>
      ${l.evidence ? `<div class="d-card wide"><h4>Evidence / activity</h4><p>${escapeHtml(l.evidence)}</p></div>` : ''}
    </div>

    ${l.images && l.images.length ? `
    <div class="d-figures">${l.images.map(im => `
      <figure class="d-figure${im.wide ? ' wide' : ''}">
        <a href="${escapeHtml(im.src)}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(im.title)} full size in a new tab">
          <img src="${escapeHtml(im.src)}" alt="${escapeHtml(im.alt)}" loading="lazy" />
        </a>
        <figcaption><strong>${escapeHtml(im.title)}</strong><span>${escapeHtml(im.caption)}</span></figcaption>
      </figure>`).join('')}
    </div>` : ''}

    ${l.num === '03' && profile.cvPdf ? `
    <div class="d-cta">
      <p>This lecture connects directly to my final CV.</p>
      <a class="btn btn-primary" href="#cv" data-close-drawer>See my CV</a>
    </div>` : ''}

    <div class="d-pager">
      <span></span>
      ${next
        ? `<button type="button" class="btn btn-ghost" data-open-lecture="${next.num}">Next lecture →</button>`
        : `<a class="btn btn-primary" href="#project" data-close-drawer>Go to final project →</a>`}
    </div>`;
}

function openLecture(num){
  const index = lectures.findIndex(l => l.num === num);
  if(index < 0 || !drawer) return;
  currentIndex = index;
  $('#drawerScroll').innerHTML = lectureTemplate(lectures[index], index);
  $('#drawerScroll').scrollTop = 0;
  $('#drawerCount').textContent = `Entry ${lectures[index].num} of ${lectures[lectures.length-1].num}`;
  $('#prevLecture').disabled = index === 0;
  $('#nextLecture').disabled = index === lectures.length - 1;
  if(!drawer.open) drawer.showModal();
  history.replaceState(null, '', `#lecture-${num}`);
}

function initDrawer(){
  if(!drawer) return;
  $('#closeDrawer')?.addEventListener('click', () => drawer.close());
  $('#prevLecture')?.addEventListener('click', () => currentIndex > 0 && openLecture(lectures[currentIndex-1].num));
  $('#nextLecture')?.addEventListener('click', () => currentIndex < lectures.length-1 && openLecture(lectures[currentIndex+1].num));
  // click on the dimmed backdrop closes it
  drawer.addEventListener('click', e => { if(e.target === drawer) drawer.close(); });
  drawer.addEventListener('close', () => {
    if(location.hash.startsWith('#lecture-')) history.replaceState(null, '', '#journal');
  });
  drawer.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft') $('#prevLecture')?.click();
    if(e.key === 'ArrowRight') $('#nextLecture')?.click();
  });
}

/* Delegated clicks: open-lecture triggers, drawer links, filters, tabs */
document.addEventListener('click', e => {
  const opener = e.target.closest('[data-open-lecture]');
  if(opener){ openLecture(opener.dataset.openLecture); return; }

  const closer = e.target.closest('[data-close-drawer]');
  if(closer){ drawer?.close(); }

  const filterBtn = e.target.closest('#filterRow button');
  if(filterBtn){
    $$('#filterRow button').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    filterBtn.classList.add('active'); filterBtn.setAttribute('aria-pressed','true');
    filterLectures();
  }

  const tab = e.target.closest('.tab');
  if(tab) activateTab(tab);
});
$('#lectureSearch')?.addEventListener('input', filterLectures);

function handleLectureHash(){
  const m = location.hash.match(/^#lecture-(\d+)$/);
  if(m) openLecture(m[1]);
}
window.addEventListener('hashchange', handleLectureHash);

/* ===========================================================
   PROJECT TABS
=========================================================== */
function activateTab(tab, focus=false){
  const wrap = tab.closest('.ptabs');
  $$('.tab', wrap).forEach(t => { const on = t === tab; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
  $$('.tab-panel', wrap).forEach(p => { const on = p.id === tab.dataset.tab; p.classList.toggle('active', on); p.hidden = !on; });
  if(focus) tab.focus();
}
function initTabs(){
  $$('.ptabs').forEach(wrap => {
    const tabs = $$('.tab', wrap);
    tabs.forEach(t => t.tabIndex = t.classList.contains('active') ? 0 : -1);
    $('.tab-list', wrap).addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement); if(i < 0) return;
      const move = { ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1 }[e.key];
      if(move){ e.preventDefault(); activateTab(tabs[(i + move + tabs.length) % tabs.length], true); }
      if(e.key === 'Home'){ e.preventDefault(); activateTab(tabs[0], true); }
      if(e.key === 'End'){ e.preventDefault(); activateTab(tabs[tabs.length-1], true); }
    });
  });
}

/* ===========================================================
   TEAM LIST
=========================================================== */
function renderTeam(){
  const grid = $('#teamGrid');
  if(grid) grid.innerHTML = team.map((member, i)=>`<tr><td>${i+1}</td><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.saNumber)}</td></tr>`).join('');
}

/* ===========================================================
   SCROLL REVEAL + COUNTERS
=========================================================== */
function initReveal(){
  const items = $$('.reveal');
  if(!('IntersectionObserver' in window)){ items.forEach(el => el.classList.add('visible')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('visible'); obs.unobserve(entry.target); } });
  }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
  items.forEach(el => obs.observe(el));
}

function initCounters(){
  const counters = $$('[data-count]');
  const set = (el, val, target) => { el.textContent = target >= 1000 ? val.toLocaleString() : val; };
  if(reducedMotion || !('IntersectionObserver' in window)){ counters.forEach(c => set(c, +c.dataset.count, +c.dataset.count)); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target; const target = +el.dataset.count; let start = null;
      const duration = 1200;
      function tick(ts){
        if(!start) start = ts;
        const p = Math.min((ts-start)/duration, 1);
        set(el, Math.floor(target * (1 - Math.pow(1-p,3))), target);
        if(p<1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick); obs.unobserve(el);
    });
  }, {threshold:.5});
  counters.forEach(c => obs.observe(c));
}

/* ===========================================================
   LIGHTBOX
=========================================================== */
function initLightbox(){
  const box = $('#lightbox'); const img = $('#lightbox img');
  if(!box) return;
  const open = fig => { img.src = fig.dataset.light; img.alt = $('img', fig)?.alt || ''; box.classList.add('open'); box.setAttribute('aria-hidden','false'); };
  const close = () => { box.classList.remove('open'); box.setAttribute('aria-hidden','true'); img.src = ''; };
  $$('.gallery-grid figure, .moment').forEach(fig => {
    fig.tabIndex = 0; fig.setAttribute('role','button');
    fig.addEventListener('click', () => open(fig));
    fig.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(fig); } });
  });
  $('#closeLightbox')?.addEventListener('click', close);
  box.addEventListener('click', e => { if(e.target === box) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && box.classList.contains('open')) close(); });
}

/* ===========================================================
   GLOBAL SEARCH
=========================================================== */
function initSearchDialog(){
  const dlg = $('#searchDialog'), input = $('#globalSearch'), results = $('#searchResults');
  if(!dlg) return;
  const open = () => { if(dlg.open) return; dlg.showModal(); input.value = ''; renderSearch(''); input.focus(); };
  const close = () => dlg.close();
  $('#openSearch')?.addEventListener('click', open);
  $('#closeSearch')?.addEventListener('click', close);
  dlg.addEventListener('click', e => { if(e.target === dlg) close(); });

  document.addEventListener('keydown', e => {
    const typing = ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); open(); }
    else if(e.key === '/' && !typing && !document.querySelector('dialog[open]')){ e.preventDefault(); open(); }
  });

  function renderSearch(q){
    const query = (q||'').toLowerCase().trim();
    const items = lectures.filter(l => !query || JSON.stringify(l).toLowerCase().includes(query));
    results.innerHTML = items.slice(0,8).map(l => `<button type="button" data-num="${l.num}"><strong>${l.num} · ${escapeHtml(l.title)}</strong><span>${escapeHtml(l.learned)}</span></button>`).join('') || '<p>No matching lecture found.</p>';
  }
  results.addEventListener('click', e => {
    const b = e.target.closest('button[data-num]'); if(!b) return;
    close(); openLecture(b.dataset.num);
  });
  input.addEventListener('input', e => renderSearch(e.target.value));
}

/* ===========================================================
   RAIL: scroll progress, section spy, mobile menu
=========================================================== */
function initRail(){
  const progress = $('#scrollProgress');
  const links = $$('.rail-nav a');
  const secs = $$('main section[id]');
  const onScroll = () => {
    const y = scrollY; const h = document.documentElement.scrollHeight - innerHeight;
    if(progress) progress.style.width = `${h ? (y/h)*100 : 0}%`;
    let current = secs[0]?.id || '';
    secs.forEach(sec => { if(sec.getBoundingClientRect().top < innerHeight * .35) current = sec.id; });
    links.forEach(a => a.classList.toggle('active', a.dataset.sec === current));
  };
  document.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  const btn = $('#menuBtn'); const panel = $('#railPanel');
  const setOpen = open => { panel?.classList.toggle('open', open); btn?.setAttribute('aria-expanded', open); };
  btn?.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  links.forEach(a => a.addEventListener('click', () => setOpen(false)));
  $('#openSearch')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if(e.key === 'Escape') setOpen(false); });
}

/* ===========================================================
   INIT
=========================================================== */
applyProfile();
initTheme();
renderLectureGrid();
renderTeam();
initDrawer();
initTabs();
initReveal();
initCounters();
initLightbox();
initSearchDialog();
initRail();
handleLectureHash();
