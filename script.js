const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];
const lectures = window.PORTFOLIO_LECTURES || [];
const team = window.TEAM_MEMBERS || [];

window.addEventListener('load', () => setTimeout(() => $('#preloader')?.classList.add('hide'), 450));

function escapeHtml(str=''){ return String(str).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

/* ===========================================================
   LECTURE JOURNAL — accordion panels + sidebar map + filters
=========================================================== */
function renderLectures(){
  const stack = $('#lectureStack');
  const map = $('#lectureMap');
  const filters = $('#filterRow');
  if(!stack || !map || !filters) return;

  const areas = ['All', ...new Set(lectures.map(l => l.area))];
  filters.innerHTML = areas.map((a,i)=>`<button type="button" class="${i===0?'active':''}" data-filter="${escapeHtml(a)}">${escapeHtml(a)}</button>`).join('');

  map.innerHTML = lectures.map(l => `<a href="#lecture-${l.num}" data-spy="lecture-${l.num}" data-num="${l.num}"><span>${l.num}</span><strong>${escapeHtml(l.short)}</strong></a>`).join('');

  stack.innerHTML = lectures.map((l, index) => `
    <article class="lecture-panel reveal${index===0 ? ' open' : ''}" id="lecture-${l.num}" data-area="${escapeHtml(l.area)}" style="transition-delay:${Math.min(index*30,240)}ms">
      <div class="lecture-head">
        <div class="lecture-num">${l.num}</div>
        <div class="lecture-title">
          <div class="lecture-meta"><span>${escapeHtml(l.tag)}</span><span>${escapeHtml(l.area)}</span><span>${escapeHtml(l.short)}</span></div>
          <h3>${escapeHtml(l.title)}</h3>
        </div>
        <div class="lecture-toggle">+</div>
      </div>
      <div class="lecture-body">
        <div class="lecture-body-inner">
          <div class="lecture-intro">
            <div class="intro-card"><h4>Lecture focus</h4><p>${escapeHtml(l.intro)}</p></div>
            <div class="focus-card"><h4>Details from slides</h4><div class="focus-list">${l.slide_focus.map(x=>`<span class="focus-chip">${escapeHtml(x)}</span>`).join('')}</div></div>
          </div>
          <div class="detail-grid">
            <div class="detail-card"><h4>Key concepts</h4><ul class="concept-list">${l.core.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
            <div class="detail-card"><h4>What I learned</h4><p>${escapeHtml(l.learned)}</p></div>
            <div class="detail-card"><h4>My learning experience</h4><p>${escapeHtml(l.experience)}</p></div>
            <div class="detail-card"><h4>Soft skills developed</h4><p>${escapeHtml(l.soft)}</p></div>
            <div class="detail-card"><h4>Real-life application</h4><p>${escapeHtml(l.application)}</p></div>
            <div class="detail-card"><h4>Evidence / activity</h4><p>${escapeHtml(l.evidence)}</p></div>
          </div>
          ${l.num === '03' ? `
          <div class="lecture-inline-doc cv-inline" id="cv">
            <div class="inline-doc-copy">
              <p class="eyebrow"><span></span>My CV</p>
              <h4>Final CV Preview & Download</h4>
              <p>This lecture directly connects to my final CV. You can view it online or download it as a PDF from here.</p>
              <div class="hero-actions">
                <a class="btn primary magnetic" href="assets/docs/vaheesh-cv.pdf" target="_blank" rel="noopener">View CV</a>
                <a class="btn secondary magnetic" href="assets/docs/vaheesh-cv.pdf" download="Vaheesh_Final_CV.pdf">Download CV</a>
              </div>
            </div>
            <div class="inline-doc-frame">
              <iframe src="assets/docs/vaheesh-cv.pdf#view=FitH" title="S. Vaheesh CV preview"></iframe>
            </div>
          </div>` : ''}
          <div class="quote-card">
            <blockquote>&ldquo;${escapeHtml(l.quote)}&rdquo;</blockquote>
            <a class="btn secondary magnetic" href="#lecture-${lectures[Math.min(index+1, lectures.length-1)].num}" data-next="${index === lectures.length-1 ? '' : lectures[index+1].num}">${index === lectures.length-1 ? 'Go to Final Project →' : 'Next Lecture →'}</a>
          </div>
        </div>
      </div>
    </article>`).join('');

  // open the first panel's body height after render
  requestAnimationFrame(() => {
    $$('.lecture-panel.open .lecture-body').forEach(setBodyHeight);
  });

  // accordion toggle
  $$('.lecture-head').forEach(head => {
    head.addEventListener('click', () => {
      const panel = head.closest('.lecture-panel');
      animateLectureSelection(panel, null, {scroll:false});
    });
  });

  // "Next Lecture" buttons open the next panel after scroll
  $$('.quote-card a[data-next]').forEach(a => {
    a.addEventListener('click', e => {
      const num = a.dataset.next;
      if(!num) return;
      setTimeout(() => {
        const target = $(`#lecture-${num}`);
        if(target && !target.classList.contains('open')){
          animateLectureSelection(target, null, {scroll:true, force:true});
        }
      }, 350);
    });
  });

  // sidebar map clicks open the exact selected lecture only
  $$('#lectureMap a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const num = a.dataset.num;
      const target = $(`#lecture-${num}`);
      if(target){
        animateLectureSelection(target, a, {scroll:true, force:true});
        history.replaceState(null, '', `#lecture-${num}`);
      }
    });
  });

  initReveal(); initTilt(); initMagnetic(); initSpy();
}

function setBodyHeight(body){
  if(!body) return;
  body.style.maxHeight = body.scrollHeight + 'px';
}

function setActiveLectureMap(lectureId, sourceLink=null){
  const links = $$('[data-spy]');
  links.forEach(a => a.classList.toggle('active', a.dataset.spy === lectureId));
  if(sourceLink){
    sourceLink.classList.remove('select-bounce');
    void sourceLink.offsetWidth;
    sourceLink.classList.add('select-bounce');
  }
}

function animateLectureSelection(panel, sourceLink=null, options={}){
  if(!panel) return;
  const {scroll=false, force=false} = options;
  const wasOpen = panel.classList.contains('open');

  $$('.lecture-panel').forEach(p => {
    p.classList.remove('open','selecting');
    const body = $('.lecture-body', p);
    if(body) body.style.maxHeight = '0px';
  });

  setActiveLectureMap(panel.id, sourceLink);

  if(force || !wasOpen){
    panel.classList.add('open','selecting');
    const body = $('.lecture-body', panel);
    setBodyHeight(body);
    if(scroll) panel.scrollIntoView({behavior:'smooth', block:'start'});
    setTimeout(() => panel.classList.remove('selecting'), 900);
  }else{
    // Keep the map highlight on the exact lecture even when user closes it.
    panel.classList.remove('open','selecting');
  }
}

window.addEventListener('resize', () => {
  $$('.lecture-panel.open .lecture-body').forEach(setBodyHeight);
});

/* ===========================================================
   TEAM GRID
=========================================================== */
function renderTeam(){
  const grid = $('#teamGrid');
  if(grid) grid.innerHTML = team.map((member, i)=>`<tr><td>${i+1}</td><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.saNumber)}</td></tr>`).join('');
}

/* ===========================================================
   FILTER + SEARCH (journal)
=========================================================== */
function filterLectures(){
  const q = ($('#lectureSearch')?.value || '').toLowerCase().trim();
  const active = $('#filterRow button.active')?.dataset.filter || 'All';
  $$('.lecture-panel').forEach(card => {
    const l = lectures.find(x => `lecture-${x.num}` === card.id);
    const text = JSON.stringify(l).toLowerCase();
    const showArea = active === 'All' || l.area === active;
    const showQ = !q || text.includes(q);
    card.classList.toggle('hidden-by-filter', !(showArea && showQ));
  });
}

document.addEventListener('click', e => {
  const filterBtn = e.target.closest('#filterRow button');
  if(filterBtn){
    $$('#filterRow button').forEach(b=>b.classList.remove('active'));
    filterBtn.classList.add('active');
    filterLectures();
  }
  const tab = e.target.closest('.tab');
  if(tab){
    const wrap = tab.closest('.project-tabs');
    $$('.tab', wrap).forEach(t=>t.classList.remove('active'));
    $$('.tab-panel', wrap).forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    $('#' + tab.dataset.tab)?.classList.add('active');
  }
});
$('#lectureSearch')?.addEventListener('input', filterLectures);

/* ===========================================================
   SCROLL REVEAL
=========================================================== */
function initReveal(){
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('visible'); obs.unobserve(entry.target); } });
  }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
  $$('.reveal').forEach(el => { if(!el.classList.contains('visible')) obs.observe(el); });
}

/* ===========================================================
   SIDEBAR SPY (highlight active lecture in map)
=========================================================== */
function initSpy(){
  const sync = () => {
    const open = $('.lecture-panel.open');
    if(open) setActiveLectureMap(open.id);
  };
  sync();
  document.addEventListener('scroll', () => requestAnimationFrame(sync), {passive:true});
}

/* ===========================================================
   TILT (desktop only)
=========================================================== */
function initTilt(){
  if(matchMedia('(pointer: coarse)').matches) return;
  $$('.tilt').forEach(card => {
    if(card.dataset.tiltReady) return; card.dataset.tiltReady = '1';
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(1000px) rotateX(${(-y*3).toFixed(2)}deg) rotateY(${(x*3).toFixed(2)}deg) translateY(-2px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ===========================================================
   MAGNETIC BUTTONS (desktop only)
=========================================================== */
function initMagnetic(){
  if(matchMedia('(pointer: coarse)').matches) return;
  $$('.magnetic').forEach(btn => {
    if(btn.dataset.magneticReady) return; btn.dataset.magneticReady = '1';
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width/2);
      const y = e.clientY - (r.top + r.height/2);
      btn.style.transform = `translate(${x*.15}px,${y*.15}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}

/* ===========================================================
   ANIMATED COUNTERS
=========================================================== */
function initCounters(){
  const counters = $$('[data-count]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target; const target = +el.dataset.count; let start = null;
      const duration = 1200;
      function tick(ts){
        if(!start) start = ts;
        const p = Math.min((ts-start)/duration,1);
        const val = Math.floor(target * (1 - Math.pow(1-p,3)));
        el.textContent = target >= 1000 ? val.toLocaleString() : val;
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
  $$('.gallery-grid figure, .project-moment-grid figure').forEach(fig => fig.addEventListener('click', () => {
    img.src = fig.dataset.light; box.classList.add('open'); box.setAttribute('aria-hidden','false');
  }));
  $('#closeLightbox')?.addEventListener('click', () => { box.classList.remove('open'); box.setAttribute('aria-hidden','true'); img.src=''; });
  box?.addEventListener('click', e => { if(e.target === box) $('#closeLightbox')?.click(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') $('#closeLightbox')?.click(); });
}

/* ===========================================================
   GLOBAL SEARCH DIALOG
=========================================================== */
function initSearchDialog(){
  const dlg = $('#searchDialog'), input = $('#globalSearch'), results = $('#searchResults');
  const open = () => { if(dlg?.showModal){ dlg.showModal(); setTimeout(()=>input?.focus(),60); renderSearch(''); } };
  const close = () => dlg?.close();
  $('#openSearch')?.addEventListener('click', open);
  $('#closeSearch')?.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); open(); }
    if(e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){ e.preventDefault(); open(); }
  });
  function renderSearch(q){
    const query = (q||'').toLowerCase().trim();
    const items = lectures.filter(l => !query || JSON.stringify(l).toLowerCase().includes(query));
    results.innerHTML = items.slice(0,8).map(l => `<a href="#lecture-${l.num}" data-num="${l.num}"><strong>${l.num} · ${escapeHtml(l.title)}</strong><span>${escapeHtml(l.learned)}</span></a>`).join('') || '<p>No matching lecture found.</p>';
    $$('#searchResults a').forEach(a => a.addEventListener('click', () => {
      dlg.close();
      const target = $(`#lecture-${a.dataset.num}`);
      if(target){
        setTimeout(() => animateLectureSelection(target, null, {scroll:true, force:true}), 250);
      }
    }));
  }
  input?.addEventListener('input', e => renderSearch(e.target.value));
}

/* ===========================================================
   HEADER, SCROLL PROGRESS, SECTION SPY
=========================================================== */
function initHeaderAndScroll(){
  const header = $('#siteHeader'); const progress = $('#scrollProgress');
  const navLinks = $$('.main-nav a');
  const onScroll = () => {
    const y = scrollY;
    header?.classList.toggle('scrolled', y>40);
    const h = document.documentElement.scrollHeight - innerHeight;
    if(progress) progress.style.width = `${h ? (y/h)*100 : 0}%`;
    let current = '';
    $$('main section[id]').forEach(sec => { if(sec.getBoundingClientRect().top < 170) current = sec.id; });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
  };
  document.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  $('#menuToggle')?.addEventListener('click', () => {
    $('#menuToggle')?.classList.toggle('open');
    $('#mainNav')?.classList.toggle('open');
  });
  navLinks.forEach(a => a.addEventListener('click', () => {
    $('#mainNav')?.classList.remove('open');
    $('#menuToggle')?.classList.remove('open');
  }));
}

/* ===========================================================
   CURSOR GLOW (desktop only)
=========================================================== */
function initCursor(){
  const glow = $('#cursorGlow'); if(!glow || matchMedia('(pointer: coarse)').matches) return;
  document.addEventListener('pointermove', e => { glow.style.left = e.clientX+'px'; glow.style.top = e.clientY+'px'; }, {passive:true});
}

/* ===========================================================
   AMBIENT PARTICLE CANVAS (gold, low-key)
=========================================================== */
function initCanvas(){
  const canvas = $('#ambientCanvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles, ribbons;
  const palette = [
    [30, 138, 83],    // forest green
    [97, 194, 116],   // fresh leaf
    [198, 146, 46],   // premium gold
    [141, 224, 170],  // mint glow
    [54, 156, 112]    // emerald
  ];
  function resize(){
    const ratio = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * ratio;
    h = canvas.height = innerHeight * ratio;
    canvas.style.width = innerWidth+'px';
    canvas.style.height = innerHeight+'px';
    const count = Math.min(140, Math.max(70, Math.floor(innerWidth/12)));
    particles = Array.from({length: count}, (_, i) => {
      const c = palette[i % palette.length];
      return {
        x: Math.random()*w, y: Math.random()*h,
        r: (Math.random()*3.3+1.3)*ratio,
        vx:(Math.random()-.5)*.28*ratio,
        vy:(Math.random()-.5)*.28*ratio,
        a: Math.random()*.30+.16,
        c
      };
    });
    ribbons = Array.from({length: 5}, (_, i) => ({
      y: (h/6)*(i+1),
      amp: (36 + Math.random()*52) * ratio,
      speed: .00078 + i*.00015,
      c: palette[i]
    }));
  }
  function rgba(c,a){ return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function draw(ts=0){
    ctx.clearRect(0,0,w,h);

    // soft animated aurora ribbons
    ribbons.forEach((r, idx) => {
      ctx.beginPath();
      for(let x=0; x<=w; x+=24){
        const y = r.y + Math.sin(x*.005 + ts*r.speed + idx) * r.amp + Math.cos(x*.0028 + ts*r.speed*.75) * r.amp*.55;
        if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.lineWidth = (1.8 + idx*.35) * (Math.min(devicePixelRatio || 1, 2));
      ctx.strokeStyle = rgba(r.c, .14);
      ctx.stroke();
    });

    particles.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>w) p.vx*=-1;
      if(p.y<0||p.y>h) p.vy*=-1;
      const glow = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*7.5);
      glow.addColorStop(0, rgba(p.c,p.a));
      glow.addColorStop(1, rgba(p.c,0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*7.5,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=rgba(p.c,Math.min(.55,p.a+.16));
      ctx.fill();
    });
    for(let i=0;i<particles.length;i++) for(let j=i+1;j<particles.length;j++){
      const a=particles[i], b=particles[j], dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
      const limit = 165 * Math.min(devicePixelRatio || 1, 2);
      if(d<limit){
        ctx.strokeStyle=rgba(a.c,(1-d/limit)*0.10);
        ctx.lineWidth=1*Math.min(devicePixelRatio || 1, 2);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  addEventListener('resize', resize);
  resize();
  draw();
}
/* ===========================================================
   INIT
=========================================================== */
renderLectures();
renderTeam();
initReveal();
initCounters();
initLightbox();
initSearchDialog();
initHeaderAndScroll();
initCursor();
initCanvas();
initTilt();
initMagnetic();
