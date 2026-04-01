/* =============================================
   VX PAGES — App Logic
   ============================================= */

// ─── State ───────────────────────────────────
const state = {
  currentSection: 'dashboard',
  currentModule: null,
  currentSettingsTab: 'profile',
  builderStep: 1,
  builderData: {},
  pages: [],
  _pagesLoaded: false,
  modules: {
    prospecting: {
      title: 'Prospecção',
      icon: '🎯',
      desc: 'Aprenda a identificar e atrair clientes ideais para o seu negócio digital.',
      color: 'var(--blue)',
      progress: 60,
      lessons: [
        { title: 'Introdução à Prospecção Digital',      duration: '12 min', type: 'video',    done: true  },
        { title: 'Definindo seu Avatar de Cliente',       duration: '18 min', type: 'video',    done: true  },
        { title: 'Estratégias de Outbound',               duration: '20 min', type: 'video',    done: true  },
        { title: 'Scripts de Abordagem que Convertem',   duration: '15 min', type: 'text',     done: false, current: true },
        { title: 'Automação de Prospecção',              duration: '22 min', type: 'video',    done: false },
        { title: 'Exercício Prático: 10 Prospects',      duration: '30 min', type: 'exercise', done: false, locked: true },
      ]
    },
    sales: {
      title: 'Reunião de Vendas',
      icon: '🤝',
      desc: 'Domine a arte de conduzir reuniões de vendas de alto impacto.',
      color: '#7b2fff',
      progress: 33,
      lessons: [
        { title: 'Framework de Reunião de Vendas',       duration: '14 min', type: 'video',    done: true  },
        { title: 'Rapport e Conexão Inicial',            duration: '10 min', type: 'video',    done: false, current: true },
        { title: 'Diagnóstico de Necessidades',          duration: '16 min', type: 'video',    done: false },
        { title: 'Apresentação de Proposta',             duration: '20 min', type: 'text',     done: false, locked: true },
        { title: 'Objeções e Como Vencê-las',           duration: '25 min', type: 'video',    done: false, locked: true },
        { title: 'Fechamento e Próximos Passos',         duration: '18 min', type: 'exercise', done: false, locked: true },
      ]
    },
    onboarding: {
      title: 'Onboarding & Briefing',
      icon: '📋',
      desc: 'Como receber novos clientes e coletar todas as informações para criar páginas perfeitas.',
      color: 'var(--green)',
      progress: 0,
      lessons: [
        { title: 'O que é Onboarding de Clientes',       duration: '8 min',  type: 'video',    done: false, current: true },
        { title: 'Formulário de Briefing Completo',      duration: '12 min', type: 'text',     done: false, locked: true },
        { title: 'Reunião de Briefing: Passo a Passo',   duration: '20 min', type: 'video',    done: false, locked: true },
        { title: 'Definindo Entregáveis e Prazo',        duration: '14 min', type: 'video',    done: false, locked: true },
        { title: 'Comunicação com o Cliente',            duration: '10 min', type: 'text',     done: false, locked: true },
        { title: 'Exercício: Simule um Onboarding',      duration: '40 min', type: 'exercise', done: false, locked: true },
      ]
    },
    creation: {
      title: 'Criação de Páginas',
      icon: '✨',
      desc: 'Use a IA do VX Pages para criar landing pages de alta conversão em minutos.',
      color: 'var(--yellow)',
      progress: 80,
      lessons: [
        { title: 'Anatomia de uma Landing Page',         duration: '16 min', type: 'video',    done: true  },
        { title: 'Copywriting com IA: Introdução',       duration: '20 min', type: 'video',    done: true  },
        { title: 'Hero, Benefícios e Prova Social',      duration: '18 min', type: 'video',    done: true  },
        { title: 'CTA e Urgência que Convertem',         duration: '12 min', type: 'text',     done: true  },
        { title: 'Design e Visual com o Builder',        duration: '22 min', type: 'video',    done: false, current: true },
        { title: 'Publicação e Testes A/B',              duration: '15 min', type: 'exercise', done: false, locked: true },
      ]
    }
  }
};

// ─── DOM Helpers ─────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── Navigation ──────────────────────────────
function navigate(section) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  const target = $(`section-${section}`);
  if (target) target.classList.add('active');
  document.querySelectorAll(`[data-nav="${section}"]`).forEach(el => el.classList.add('active'));
  state.currentSection = section;
  updateTopbar(section);

  // Recarrega páginas ao navegar para a seção
  if (section === 'pages' && state._pagesLoaded) loadPages();
}

function updateTopbar(section) {
  const titles = {
    dashboard:  ['Dashboard',       'Bem-vindo de volta, Rafael! 👋'],
    builder:    ['Criar Nova Página', 'IA gerando sua landing page'],
    pages:      ['Minhas Páginas',  'Gerencie e acompanhe suas páginas'],
    training:   ['Centro de Treinamento', 'Desenvolva suas habilidades'],
    settings:   ['Configurações',   'Gerencie sua conta e preferências'],
  };
  const [title, sub] = titles[section] || ['VX Pages', ''];
  $('topbar-title').textContent = title;
  $('topbar-sub').textContent = sub;
}

// ─── Splash → App (controlado por auth.js) ───
// doLogin() e signOut() são definidos em auth.js

// ─── Toast ───────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg"></span>
    <span class="toast-close" onclick="this.parentElement.remove()">×</span>
  `;
  toast.querySelector('.toast-msg').textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ─── Load pages from API ─────────────────────
async function loadPages() {
  const user = typeof currentUser !== 'undefined' ? currentUser : null;
  if (!user?.email) return;
  try {
    const res  = await fetch(`/api/pages?email=${encodeURIComponent(user.email)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro');
    state.pages = (json.pages || []).map(p => ({
      id:           p.id,
      name:         p.title,
      status:       p.published ? 'live' : 'draft',
      date:         new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      url:          p.url || null,
      whatsapp:     p.whatsapp || '',
      checkoutUrl:  p.checkout_url || '',
    }));
    state._pagesLoaded = true;
    renderPages();
    renderDashboard();
  } catch (e) {
    console.error('[loadPages]', e.message);
  }
}

// ─── Dashboard ───────────────────────────────
function renderDashboard() {
  const list = $('dash-pages-list');
  if (!list) return;
  if (!state.pages.length) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--gray);font-size:0.82rem">Nenhuma página criada ainda.</div>`;
    return;
  }
  list.innerHTML = state.pages.slice(0, 4).map(p => `
    <div class="page-item">
      <div class="page-thumb thumb-1">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
      </div>
      <div class="page-info">
        <div class="page-name">${p.name}</div>
        <div class="page-meta">${p.date}</div>
      </div>
      <div class="page-status ${p.status}">${p.status === 'live' ? 'Publicada' : 'Rascunho'}</div>
    </div>
  `).join('');
}

// ─── Training ────────────────────────────────
function renderTraining() {
  // Progress
  const totalLessons = Object.values(state.modules).reduce((a, m) => a + m.lessons.length, 0);
  const doneLessons  = Object.values(state.modules).reduce((a, m) => a + m.lessons.filter(l => l.done).length, 0);
  const pct = Math.round((doneLessons / totalLessons) * 100);
  const fill = $('overall-progress');
  const label = $('overall-label');
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = `${pct}% concluído · ${doneLessons}/${totalLessons} aulas`;
}

function openModule(key) {
  state.currentModule = key;
  const mod = state.modules[key];
  if (!mod) return;
  // Hide module grid, show detail
  $('modules-overview').style.display = 'none';
  const detail = $('module-detail');
  detail.classList.add('active');
  $('module-detail-title').textContent = mod.title;
  $('module-detail-desc').textContent  = mod.desc;
  // Render lessons
  const list = $('lesson-list');
  list.innerHTML = mod.lessons.map((l, i) => `
    <div class="lesson-item ${l.done ? 'done' : ''} ${l.current ? 'current' : ''} ${l.locked ? 'locked' : ''}"
         onclick="${!l.locked ? `startLesson(${i})` : ''}">
      <div class="lesson-num">
        ${l.done ? '✓' : (i + 1)}
      </div>
      <div class="lesson-info">
        <div class="lesson-title">${l.title}</div>
        <div class="lesson-meta">${l.duration} ${l.locked ? '· 🔒 Complete aulas anteriores' : ''}</div>
      </div>
      <div class="lesson-tag ${l.type}">${
        l.type === 'video' ? '▶ Vídeo' : l.type === 'text' ? '📄 Leitura' : '✏️ Exercício'
      }</div>
    </div>
  `).join('');
}

function closeModule() {
  $('modules-overview').style.display = '';
  $('module-detail').classList.remove('active');
  state.currentModule = null;
}

function startLesson(index) {
  const mod = state.modules[state.currentModule];
  if (!mod) return;
  const lesson = mod.lessons[index];
  showToast(`Iniciando: ${lesson.title}`, 'info');
  // Mark as current
  mod.lessons.forEach((l, i) => { l.current = i === index; });
  openModule(state.currentModule);
  // Simulate progress
  setTimeout(() => {
    mod.lessons[index].done = true;
    mod.lessons[index].current = false;
    if (index + 1 < mod.lessons.length) {
      mod.lessons[index + 1].locked = false;
      mod.lessons[index + 1].current = true;
    }
    mod.progress = Math.round((mod.lessons.filter(l => l.done).length / mod.lessons.length) * 100);
    openModule(state.currentModule);
    renderTraining();
    showToast('Aula concluída! 🎉', 'success');
  }, 1500);
}

// ─── Builder ─────────────────────────────────
let builderStep = 1;

function setBuilderStep(n) {
  builderStep = n;
  for (let i = 1; i <= 5; i++) {
    const ind = $(`step-ind-${i}`);
    if (!ind) continue;
    ind.classList.remove('active', 'done');
    if (i < n) ind.classList.add('done');
    else if (i === n) ind.classList.add('active');
  }
  for (let i = 1; i <= 4; i++) {
    const line = $(`step-line-${i}`);
    if (line) line.classList.toggle('done', i < n);
  }
  $$('.builder-form-step').forEach(s => s.style.display = 'none');
  const stepEl = $(`builder-step-${n}`);
  if (stepEl) stepEl.style.display = 'block';
}

function nextBuilderStep() {
  if (builderStep < 5) setBuilderStep(builderStep + 1);
  if (builderStep === 4) startGeneration();
}

function prevBuilderStep() {
  if (builderStep > 1) setBuilderStep(builderStep - 1);
}

function startGeneration() {
  const preview = $('preview-pane-content');
  if (!preview) return;
  preview.innerHTML = `
    <div class="generating">
      <div class="gen-dots"><span></span><span></span><span></span></div>
      <span>A IA está criando sua página...</span>
    </div>
  `;
  setTimeout(() => {
    preview.innerHTML = `
      <div style="padding:20px;font-size:0.78rem;color:var(--gray-light);line-height:1.8">
        <div style="background:linear-gradient(135deg,#0d3b3b,#071a1a);border-radius:8px;padding:20px;margin-bottom:12px;text-align:center;">
          <div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:8px;">Transforme Sua Vida com o Método X</div>
          <div style="color:var(--gray);font-size:0.75rem;margin-bottom:14px;">Mais de 1.200 alunos já mudaram de vida</div>
          <div style="background:var(--green);color:#071a1a;padding:10px 20px;border-radius:6px;font-weight:700;font-size:0.82rem;display:inline-block">🚀 QUERO COMEÇAR AGORA</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
          ${['✅ Resultado comprovado','⚡ Acesso imediato','🏆 Suporte especializado'].map(b=>`<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;padding:10px;text-align:center;font-size:0.7rem;">${b}</div>`).join('')}
        </div>
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;padding:14px;font-size:0.73rem;color:var(--gray);">
          ★★★★★ "Incrível! Em 30 dias eu..." — Rafael M.
        </div>
      </div>
    `;
    showToast('Página gerada com sucesso! 🎨', 'success');
    setBuilderStep(5);
  }, 2500);
}

async function exportPage() {
  const user = typeof currentUser !== 'undefined' ? currentUser : null;
  if (!user?.email) { showToast('Faça login para publicar.', 'error'); return; }

  const html = window._generatedHTML;
  if (!html) { showToast('Gere a página antes de publicar.', 'error'); return; }

  const btn = $('btn-export');
  if (btn) { btn.disabled = true; btn.textContent = 'Publicando...'; }

  try {
    const title       = document.getElementById('field-product')?.value?.trim() || 'Minha Página';
    const whatsapp    = document.getElementById('field-whatsapp')?.value?.trim() || '';
    const checkoutUrl = document.getElementById('field-checkout-url')?.value?.trim() || '';

    const res  = await fetch('/api/pages/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: user.email, title, html, whatsapp, checkout_url: checkoutUrl }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao salvar');

    showToast('Página publicada! 🚀', 'success');

    // Mostra URL pública no browser-url do preview
    if (json.url) {
      document.querySelectorAll('.browser-url').forEach(el => el.textContent = json.url);
      // Copia URL para clipboard
      navigator.clipboard?.writeText(json.url).catch(() => {});
      setTimeout(() => showToast(`URL copiada: ${json.url}`, 'info', 5000), 800);
    }

    // Recarrega lista de páginas
    await loadPages();
  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Publicar Página'; }
  }
}

// ─── Pages ───────────────────────────────────
function renderPages() {
  const grid = $('pages-grid');
  if (!grid) return;
  const thumbs = ['thumb-1','thumb-2','thumb-3','thumb-4','thumb-5'];
  grid.innerHTML = `
    <div class="new-page-card" onclick="navigate('builder'); setBuilderStep(1);">
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
      </svg>
      <span>Criar Nova Página</span>
    </div>
    ${state.pages.map((p, i) => {
      const thumb = thumbs[i % thumbs.length];
      const urlLink = p.url
        ? `<a href="${p.url}" target="_blank" rel="noopener" style="font-size:0.7rem;color:var(--green);text-decoration:none;word-break:break-all" title="Abrir página">↗ Ver publicada</a>`
        : '';
      return `
      <div class="pg-card">
        <div class="pg-thumb ${thumb}">
          <div style="display:flex;flex-direction:column;gap:4px;padding:10px;width:100%">
            <div style="height:8px;background:rgba(255,255,255,0.2);border-radius:4px;width:60%"></div>
            <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px;width:80%"></div>
            <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px;width:50%"></div>
            <div style="height:20px;background:rgba(0,255,133,0.3);border-radius:4px;width:40%;margin-top:6px"></div>
          </div>
          <div class="pg-thumb-overlay">
            <button onclick="editPage('${p.id}')">Editar Página</button>
          </div>
        </div>
        <div class="pg-body">
          <div class="pg-name">${p.name}</div>
          <div class="pg-info">${p.date}</div>
          ${urlLink ? `<div style="padding:0 0 4px">${urlLink}</div>` : ''}
          <div class="pg-footer">
            <div class="pg-stats">
              <div class="pg-stat"><strong>—</strong> views</div>
            </div>
            <div class="page-status ${p.status}">${p.status === 'live' ? 'Publicada' : 'Rascunho'}</div>
          </div>
        </div>
      </div>`;
    }).join('')}
  `;
}

// ─── Editor modal ─────────────────────────────
let _editorPageId = null;

async function editPage(id) {
  const user = typeof currentUser !== 'undefined' ? currentUser : null;
  if (!user?.email) return;

  showToast('Carregando editor...', 'info');
  try {
    const res  = await fetch(`/api/pages/${id}/html?email=${encodeURIComponent(user.email)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro');

    _editorPageId = id;

    const page = state.pages.find(p => String(p.id) === String(id));

    // Pre-fill campos do editor
    const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
    document.getElementById('editor-title').textContent = page?.name || json.title || 'Editar Página';

    // Extrai valores atuais do HTML via data-edit
    const parser = new DOMParser();
    const doc    = parser.parseFromString(json.html, 'text/html');
    set('ef-headline',    doc.querySelector('[data-edit="headline"]')?.textContent?.trim());
    set('ef-subheadline', doc.querySelector('[data-edit="subheadline"]')?.textContent?.trim());
    set('ef-cta',         doc.querySelector('[data-edit="cta-text"]')?.textContent?.trim());
    set('ef-price',       doc.querySelector('[data-edit="price"]')?.textContent?.trim());
    set('ef-guarantee',   doc.querySelector('[data-edit="guarantee"]')?.textContent?.trim());
    set('ef-whatsapp',    page?.whatsapp || '');
    set('ef-checkout',    page?.checkoutUrl || '');

    // Carrega HTML no iframe de preview
    const iframe = document.getElementById('editor-preview');
    if (iframe) { iframe.srcdoc = json.html; }

    // Guarda HTML em memória para edição
    window._editorHTML = json.html;

    // Abre modal
    const modal = document.getElementById('editor-modal');
    if (modal) { modal.style.display = 'flex'; }
  } catch (e) {
    showToast('Erro ao abrir editor: ' + e.message, 'error');
  }
}

function closeEditor() {
  const modal = document.getElementById('editor-modal');
  if (modal) modal.style.display = 'none';
  _editorPageId = null;
  window._editorHTML = null;
}

// Aplica edição ao HTML em memória e atualiza o iframe
function applyEditorField(attr, value, isLink) {
  let html = window._editorHTML || '';
  if (!html) return;

  if (isLink) {
    // Atualiza href nos elementos com data-edit="attr"
    const re1 = new RegExp(`(<[^>]*data-edit="${attr}"[^>]*\\s)href="[^"]*"`, 'g');
    const re2 = new RegExp(`(<[^>]*\\s)href="[^"]*"(\\s[^>]*data-edit="${attr}")`, 'g');
    html = html.replace(re1, `$1href="${value}"`).replace(re2, `$1href="${value}"$2`);
  } else {
    // Atualiza textContent dos elementos com data-edit="attr"
    const re = new RegExp(`(<[^>]*data-edit="${attr}"[^>]*>)[^<]*(<)`, 'g');
    html = html.replace(re, `$1${value}$2`);
  }

  window._editorHTML = html;

  const iframe = document.getElementById('editor-preview');
  if (iframe) iframe.srcdoc = html;
}

async function saveEditedPage() {
  const user = typeof currentUser !== 'undefined' ? currentUser : null;
  if (!user?.email || !_editorPageId) return;

  const html     = window._editorHTML;
  const whatsapp = document.getElementById('ef-whatsapp')?.value?.trim() || '';
  const checkout = document.getElementById('ef-checkout')?.value?.trim() || '';

  const btn = document.getElementById('editor-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

  try {
    // Salva HTML e links
    const [resHtml, resLinks] = await Promise.all([
      fetch(`/api/pages/${_editorPageId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: user.email, html }),
      }),
      fetch(`/api/pages/${_editorPageId}/links`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: user.email, whatsapp, checkout_url: checkout }),
      }),
    ]);

    if (!resHtml.ok) { const j = await resHtml.json(); throw new Error(j.error); }

    showToast('Alterações salvas! ✅', 'success');
    closeEditor();
    await loadPages();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
  }
}

// ─── Settings ────────────────────────────────
function switchSettingsTab(tab) {
  state.currentSettingsTab = tab;
  $$('.settings-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  $$('.settings-section').forEach(el => {
    el.classList.toggle('active', el.id === `settings-${tab}`);
  });
}

// ─── Builder Palettes ─────────────────────────
function selectPalette(el) {
  $$('.palette-item').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
}

function selectStyle(el) {
  $$('.style-option').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

// ─── Init ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.nav));
  });

  // Login enter key
  document.querySelectorAll('#login-email, #login-pass').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });

  // Settings tabs
  document.querySelectorAll('.settings-nav-item').forEach(el => {
    el.addEventListener('click', () => switchSettingsTab(el.dataset.tab));
  });

  // Module cards
  document.querySelectorAll('[data-module]').forEach(el => {
    el.addEventListener('click', () => openModule(el.dataset.module));
  });

  // Init renders
  renderTraining();
  renderPages();
  setBuilderStep(1);

  // Carrega páginas reais quando currentUser estiver disponível
  // auth.js chama enterApp() que dispara loadPages via evento
  document.addEventListener('vxpages:user-ready', () => {
    loadPages();
    renderDashboard();
  }, { once: false });

  // Animate progress bars
  setTimeout(() => {
    const fill = $('overall-progress');
    if (fill) fill.style.transition = 'width 1.2s ease';
  }, 100);
});
