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
  pages: [
    { id: 1, name: 'Lançamento Programa Elite', status: 'live',  niche: 'Coaching', views: 1842, conv: '9.4%', date: '14 Mar 2025', thumb: 'thumb-1' },
    { id: 2, name: 'Mentoria VSL Vendas',       status: 'live',  niche: 'Vendas',   views: 976,  conv: '6.2%', date: '10 Mar 2025', thumb: 'thumb-2' },
    { id: 3, name: 'Captação — Imersão RJ',     status: 'draft', niche: 'Eventos',  views: 0,    conv: '—',    date: '18 Mar 2025', thumb: 'thumb-3' },
    { id: 4, name: 'Produto Digital Finanças',  status: 'live',  niche: 'Finanças', views: 3211, conv: '11.8%',date: '5 Mar 2025',  thumb: 'thumb-4' },
    { id: 5, name: 'Consultoria Estratégica',   status: 'draft', niche: 'Business', views: 0,    conv: '—',    date: '19 Mar 2025', thumb: 'thumb-5' },
  ],
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
  const navItem = $(` nav-${section}`);
  document.querySelectorAll(`[data-nav="${section}"]`).forEach(el => el.classList.add('active'));
  state.currentSection = section;
  updateTopbar(section);
  if (section === 'pages' && typeof loadUserPages === 'function') loadUserPages();
}

function updateTopbar(section) {
  const titles = {
    dashboard:  ['Dashboard',       `Bem-vindo de volta, ${window.currentUser?.given || 'de volta'}! 👋`],
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

// ─── Dashboard ───────────────────────────────
async function renderDashboard() {
  const list = $('dash-pages-list');
  if (!list) return;
  const email = window.currentUser?.email;
  if (!email) { list.innerHTML = ''; return; }
  try {
    const res = await fetch(`/api/pages?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    const pages = (data.pages || []).slice(0, 4);
    const statEl = document.getElementById('stat-pages-value');
    if (statEl) statEl.textContent = (data.pages || []).length;
    if (pages.length === 0) {
      list.innerHTML = '<div style="color:var(--gray);font-size:0.85rem;text-align:center;padding:16px">Nenhuma página criada ainda.</div>';
      return;
    }
    const thumbCls = ['thumb-1','thumb-2','thumb-3','thumb-4'];
    list.innerHTML = pages.map((p, i) => `
      <div class="page-item" style="cursor:pointer" onclick="viewPage('${p.id}')">
        <div class="page-thumb ${thumbCls[i % 4]}">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div class="page-info">
          <div class="page-name">${p.title}</div>
          <div class="page-meta">${new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <div class="page-status live">Salva</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '';
  }
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
        <div style="background:linear-gradient(135deg,#084E59,#052F33);border-radius:8px;padding:20px;margin-bottom:12px;text-align:center;">
          <div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:8px;">Transforme Sua Vida com o Método X</div>
          <div style="color:var(--gray);font-size:0.75rem;margin-bottom:14px;">Mais de 1.200 alunos já mudaram de vida</div>
          <div style="background:var(--green);color:#052F33;padding:10px 20px;border-radius:6px;font-weight:700;font-size:0.82rem;display:inline-block">🚀 QUERO COMEÇAR AGORA</div>
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

function exportPage() {
  showToast('Página exportada e publicada! 🚀', 'success');
  setTimeout(() => {
    navigate('pages');
    loadUserPages();
  }, 1000);
}

// ─── Pages ───────────────────────────────────
async function loadUserPages() {
  const email = window.currentUser?.email;
  if (!email) return;
  try {
    const res = await fetch(`/api/pages?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    renderPages(data.pages || []);
    // Atualiza stat card
    const statEl = document.getElementById('stat-pages-value');
    if (statEl) statEl.textContent = (data.pages || []).length;
  } catch {}
}

function renderPages(pages = []) {
  const grid = $('pages-grid');
  if (!grid) return;

  const thumbColors = ['pg-thumb-1','pg-thumb-2','pg-thumb-3','pg-thumb-4'];

  grid.innerHTML = `
    <div class="new-page-card" onclick="navigate('builder'); setBuilderStep(1);">
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
      </svg>
      <span>Criar Nova Página</span>
    </div>
    ${pages.length === 0 ? `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);font-size:0.88rem">
        Nenhuma página criada ainda. Clique em "Criar Nova Página" para começar.
      </div>
    ` : pages.map((p, i) => `
      <div class="pg-card">
        <div class="pg-thumb ${thumbColors[i % 4]}">
          <div style="display:flex;flex-direction:column;gap:4px;padding:10px;width:100%">
            <div style="height:8px;background:rgba(255,255,255,0.2);border-radius:4px;width:60%"></div>
            <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px;width:80%"></div>
            <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px;width:50%"></div>
            <div style="height:20px;background:rgba(0,255,133,0.3);border-radius:4px;width:40%;margin-top:6px"></div>
          </div>
          <div class="pg-thumb-overlay">
            <button onclick="viewPage('${p.id}')">Ver Página</button>
            <button onclick="deletePage('${p.id}')" style="background:rgba(255,77,109,.2);border-color:rgba(255,77,109,.4)">Deletar</button>
          </div>
        </div>
        <div class="pg-body">
          <div class="pg-name">${p.title}</div>
          <div class="pg-info">${new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
          <div class="pg-footer">
            <div class="page-status live">Salva</div>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

async function viewPage(id) {
  const email = window.currentUser?.email;
  if (!email) return;
  try {
    const res = await fetch(`/api/pages/${id}/html?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.html) {
      const win = window.open('', '_blank');
      win.document.open();
      win.document.write(data.html);
      win.document.close();
    }
  } catch { showToast('Erro ao abrir página.', 'error'); }
}

async function deletePage(id) {
  if (!confirm('Deletar esta página?')) return;
  const email = window.currentUser?.email;
  if (!email) return;
  try {
    await fetch(`/api/pages/${id}?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
    showToast('Página deletada.', 'info');
    loadUserPages();
  } catch { showToast('Erro ao deletar.', 'error'); }
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
  el.closest('.style-selector, [id]').querySelectorAll('.style-option').forEach(s => s.classList.remove('selected'));
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
  renderDashboard();
  renderTraining();
  renderPages();
  setBuilderStep(1);

  // Animate progress bars
  setTimeout(() => {
    const fill = $('overall-progress');
    if (fill) fill.style.transition = 'width 1.2s ease';
  }, 100);
});
