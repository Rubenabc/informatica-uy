/* Buscador del sitio informatica.uy
   - Agrega una lupa al menú de todas las páginas.
   - El índice (buscador-datos.js) se carga solo cuando alguien abre el buscador.
   - Para actualizar el índice: volver a generar buscador-datos.js. */
(function () {
  var yo = document.currentScript;
  var BASE = new URL('.', yo ? yo.src : location.href);
  var datos = null, cargando = false, abierto = false, sel = -1, items = [];

  var css = '' +
    '.bus-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;border:0;background:transparent;color:#1F5FA8;cursor:pointer;padding:0;margin:0 2px;flex:none}' +
    '.bus-btn:hover,.bus-btn:focus-visible{background:#E8F0FA;color:#14304A}' +
    '.bus-btn svg{width:22px;height:22px}' +
    '.bus-fondo{position:fixed;inset:0;z-index:1000;background:rgba(10,25,40,.55);backdrop-filter:blur(3px);display:flex;justify-content:center;align-items:flex-start;padding:8vh 14px 14px}' +
    '.bus-fondo[hidden]{display:none}' +
    '.bus-caja{width:min(680px,100%);max-height:84vh;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;animation:bus-in .18s ease-out}' +
    '@keyframes bus-in{from{transform:translateY(-10px);opacity:0}}' +
    '@media (prefers-reduced-motion:reduce){.bus-caja{animation:none}}' +
    '.bus-barra{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:4px solid;border-image:linear-gradient(90deg,#1F5FA8,#F28C28) 1}' +
    '.bus-barra svg{width:22px;height:22px;color:#1F5FA8;flex:none}' +
    '.bus-barra input{flex:1;min-width:0;border:0;outline:0;font-size:18px;font-weight:500;line-height:1.3;font-family:inherit;color:#14304A;background:transparent}' +
    '.bus-cerrar{border:0;background:#EEF2F6;color:#14304A;border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;line-height:1;font-family:inherit;cursor:pointer}' +
    '.bus-lista{list-style:none;margin:0;padding:8px;overflow:auto}' +
    '.bus-lista li a{display:block;padding:10px 12px;border-radius:10px;text-decoration:none;color:#14304A;border-left:4px solid transparent}' +
    '.bus-lista li a:hover,.bus-lista li a.sel{background:#F1F6FC;border-left-color:#F28C28}' +
    '.bus-pag{display:block;font-size:11px;font-weight:700;line-height:1.2;letter-spacing:.08em;text-transform:uppercase;color:#1F5FA8;margin-bottom:3px}' +
    '.bus-tit{display:block;font-weight:700;font-size:16px;line-height:1.3}' +
    '.bus-txt{display:block;font-size:14px;line-height:1.45;color:#4A5B6C;margin-top:3px}' +
    '.bus-lista mark{background:#FFE2C2;color:inherit;border-radius:3px;padding:0 1px}' +
    '.bus-nada{padding:22px 16px;color:#4A5B6C;font-size:15px}' +
    '.bus-pie{padding:8px 16px;font-size:12px;color:#6B7B8C;border-top:1px solid #EEF2F6}' +
    '@media (max-width:640px){.bus-fondo{padding:10px}.bus-caja{max-height:92vh}.bus-pie{display:none}}';
  var st = document.createElement('style'); st.id = 'buscador-css'; st.textContent = css; document.head.appendChild(st);

  var LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>';

  // Botón en el menú, antes de "Contacto"
  var nav = document.querySelector('body > header nav') || document.querySelector('header nav');
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'bus-btn'; btn.innerHTML = LUPA;
  btn.setAttribute('aria-label', 'Buscar en el sitio'); btn.title = 'Buscar en el sitio (Ctrl + K)';
  if (nav) { var cta = nav.querySelector('.nav-cta'); nav.insertBefore(btn, cta || null); }

  // Ventana del buscador
  var fondo = document.createElement('div');
  fondo.className = 'bus-fondo'; fondo.hidden = true;
  fondo.innerHTML = '<div class="bus-caja" role="dialog" aria-modal="true" aria-label="Buscar en el sitio">' +
    '<div class="bus-barra">' + LUPA + '<input type="search" placeholder="Buscar: Excel, currículum, contraseñas, Ceibal…" autocomplete="off" aria-label="Qué querés buscar"><button type="button" class="bus-cerrar">Cerrar</button></div>' +
    '<ul class="bus-lista" role="listbox"></ul>' +
    '<div class="bus-pie">↑ ↓ para moverte · Enter para abrir · Esc para cerrar</div></div>';
  document.body.appendChild(fondo);
  var inp = fondo.querySelector('input'), lista = fondo.querySelector('.bus-lista');

  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function marcar(txt, pals) {
    var n = norm(txt), r = [], i;
    pals.forEach(function (p) { var k = 0; while ((i = n.indexOf(p, k)) >= 0) { r.push([i, i + p.length]); k = i + p.length; } });
    r.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    r.forEach(function (x) { if (x[0] < pos) return; out += esc(txt.slice(pos, x[0])) + '<mark>' + esc(txt.slice(x[0], x[1])) + '</mark>'; pos = x[1]; });
    return out + esc(txt.slice(pos));
  }
  function recorte(txt, pals) {
    var n = norm(txt), i = -1;
    pals.forEach(function (p) { var j = n.indexOf(p); if (j >= 0 && (i < 0 || j < i)) i = j; });
    if (i < 0) i = 0;
    var a = Math.max(0, i - 60), b = Math.min(txt.length, a + 170);
    return (a > 0 ? '…' : '') + txt.slice(a, b).trim() + (b < txt.length ? '…' : '');
  }

  function cargar(cb) {
    if (datos) return cb();
    if (cargando) return;
    cargando = true;
    var s = document.createElement('script');
    s.src = new URL('buscador-datos.js', BASE).href;
    s.onload = function () {
      datos = (window.BUSCADOR_DATOS || []).map(function (e) { e.nt = norm(e.t); e.np = norm(e.p); e.nx = norm(e.x); return e; });
      cb();
    };
    s.onerror = function () { cargando = false; lista.innerHTML = '<li class="bus-nada">No se pudo cargar el buscador. Probá recargar la página.</li>'; };
    document.head.appendChild(s);
  }

  function buscar() {
    var q = norm(inp.value.trim());
    sel = -1;
    if (!q) { lista.innerHTML = '<li class="bus-nada">Escribí una o más palabras para buscar en todas las páginas del sitio.</li>'; items = []; return; }
    if (!datos) { lista.innerHTML = '<li class="bus-nada">Cargando…</li>'; return cargar(buscar); }
    var pals = q.split(/\s+/).filter(function (p) { return p.length > 1 || q.length === 1; });
    if (!pals.length) pals = [q];
    var res = [];
    datos.forEach(function (e) {
      var todo = e.nt + ' ' + e.np + ' ' + e.nx, ok = true, pts = 0;
      pals.forEach(function (p) {
        if (todo.indexOf(p) < 0) { ok = false; return; }
        if (e.nt.indexOf(p) >= 0) pts += e.nt.indexOf(p) === 0 ? 12 : 8;
        if (e.np.indexOf(p) >= 0) pts += 3;
        if (e.nx.indexOf(p) >= 0) pts += 1;
      });
      if (ok) res.push([pts, e]);
    });
    res.sort(function (a, b) { return b[0] - a[0]; });
    items = res.slice(0, 15).map(function (r) { return r[1]; });
    if (!items.length) { lista.innerHTML = '<li class="bus-nada">No encontré resultados para «' + esc(inp.value.trim()) + '». Probá con otra palabra o <a href="' + new URL('index.html#contacto', BASE).href + '">escribime</a>.</li>'; return; }
    lista.innerHTML = items.map(function (e, i) {
      return '<li role="option"><a href="' + esc(new URL(e.u || 'index.html', BASE).href) + '" data-i="' + i + '">' +
        '<span class="bus-pag">' + esc(e.p) + '</span>' +
        '<span class="bus-tit">' + marcar(e.t, pals) + '</span>' +
        (e.x ? '<span class="bus-txt">' + marcar(recorte(e.x, pals), pals) + '</span>' : '') + '</a></li>';
    }).join('');
  }

  function marcarSel(n) {
    var as = lista.querySelectorAll('a[data-i]');
    if (!as.length) return;
    sel = (n + as.length) % as.length;
    as.forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
    as[sel].scrollIntoView({ block: 'nearest' });
  }

  function abrir() {
    if (abierto) return;
    abierto = true; fondo.hidden = false; document.documentElement.style.overflow = 'hidden';
    inp.focus(); inp.select(); buscar(); cargar(function () { if (inp.value.trim()) buscar(); });
  }
  function cerrar() {
    abierto = false; fondo.hidden = true; document.documentElement.style.overflow = '';
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', abrir);
  fondo.addEventListener('click', function (ev) { if (ev.target === fondo || ev.target.closest('.bus-cerrar')) cerrar(); });
  inp.addEventListener('input', buscar);
  inp.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); marcarSel(sel + 1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); marcarSel(sel - 1); }
    else if (ev.key === 'Enter') { var a = lista.querySelectorAll('a[data-i]')[sel < 0 ? 0 : sel]; if (a) { ev.preventDefault(); a.click(); } }
  });
  lista.addEventListener('click', function (ev) {
    var a = ev.target.closest('a'); if (!a) return;
    var u = new URL(a.href);
    // Misma página: solo cambiar de sección
    if (u.pathname === location.pathname || (u.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, ''))) {
      ev.preventDefault(); cerrar();
      if (u.hash) { if (location.hash === u.hash) { var d = document.getElementById(u.hash.slice(1)); if (d) d.scrollIntoView(); } else location.hash = u.hash; }
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && abierto) { ev.preventDefault(); cerrar(); }
    else if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'k' || ev.key === 'K')) { ev.preventDefault(); abierto ? cerrar() : abrir(); }
  });
})();
