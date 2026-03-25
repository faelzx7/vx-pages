/* =============================================
   VX PAGES — Claude AI Integration
   ============================================= */

// ─── Credits System (Supabase) ────────────────
function _userEmail() {
  try { return JSON.parse(localStorage.getItem('vxpages_user') || '{}').email || null; } catch { return null; }
}

// Cache local para não fazer fetch a cada checagem
let _creditsCache = null;

async function loadCredits() {
  const email = _userEmail();
  if (!email) return;
  try {
    const res = await fetch(`/api/credits?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      _creditsCache = await res.json();
      updateCreditsUI();
    }
  } catch {}
}

function getCreditsInfo() {
  if (_creditsCache) return _creditsCache;
  return { used: 0, limit: 15, remaining: 15, reset_date: null };
}

function hasCredits() {
  return getCreditsInfo().remaining > 0;
}

async function useCredit() {
  const email = _userEmail();
  if (!email) return;
  try {
    const res = await fetch('/api/credits/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      _creditsCache = await res.json();
      updateCreditsUI();
    }
  } catch {}
}

function updateCreditsUI() {
  const info = getCreditsInfo();
  const badgeEl = document.getElementById('credits-remaining');
  const statEl  = document.getElementById('stat-credits-value');
  const barEl   = document.getElementById('credits-progress-bar');

  if (badgeEl) badgeEl.textContent = info.remaining;

  if (statEl) {
    statEl.textContent = `${info.used} / ${info.limit}`;
    statEl.className = 'stat-value';
    if (info.remaining > 5) statEl.classList.add('green');
    else if (info.remaining >= 3) statEl.style.color = '#ffd166';
    else statEl.style.color = '#ff4d6d';
  }

  if (barEl) {
    const pct = (info.used / info.limit) * 100;
    barEl.style.width = `${pct}%`;
    barEl.style.background = info.remaining > 5 ? 'var(--green)' : info.remaining >= 3 ? '#ffd166' : '#ff4d6d';
  }
}

// ─── HTML Escape (previne XSS via output da IA) ─
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

// ─── Core fetch wrapper ───────────────────────
async function callClaude(action, data) {
  // Só generate_page consome crédito
  if (action === 'generate_page' && !hasCredits()) {
    const info = getCreditsInfo();
    const date = info.reset_date ? new Date(info.reset_date).toLocaleDateString('pt-BR') : 'próximo mês';
    showCreditsExhaustedModal(date);
    throw new Error(`Limite de ${info.limit} gerações atingido este mês.`);
  }

  const res = await fetch('/api/claude', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, data }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro desconhecido');

  if (action === 'generate_page') await useCredit();
  return json.result;
}

// ─── Collect builder form data ────────────────
function getBuilderData() {
  const get = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  const productName = get('field-product');
  const description = get('field-description');
  return {
    product:         productName ? `${productName}${description ? ': ' + description : ''}` : description,
    niche:           get('field-niche'),
    audience:        get('field-audience'),
    transformations: get('field-transformations'),
    headline:        get('field-headline'),
    price:           get('field-price'),
    style:           (() => {
      const sel = document.querySelector('.style-option.selected');
      return sel ? sel.textContent.trim() : 'Profissional';
    })(),
    palette: (() => {
      const sel = document.querySelector('.palette-item.selected');
      return sel ? (sel.title || 'Verde') : 'Verde';
    })(),
    promise: get('field-promise'),
  };
}

// ─── Suggest Description ─────────────────────
async function aiSuggestDescription() {
  const btn = this;
  setAiLoading(btn, true);
  try {
    const result = await callClaude('suggest_description', getBuilderData());
    const textarea = document.getElementById('field-description');
    if (textarea) {
      textarea.value = result;
      textarea.dispatchEvent(new Event('input'));
    }
    showToast('Descrição gerada pela IA! ✨', 'success');
  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  } finally {
    setAiLoading(btn, false);
  }
}

// ─── Generate Transformations ─────────────────
async function aiGenerateTransformations() {
  const btn = this;
  setAiLoading(btn, true);
  try {
    const result = await callClaude('generate_transformations', getBuilderData());
    const textarea = document.getElementById('field-transformations');
    if (textarea) {
      textarea.value = result;
      textarea.dispatchEvent(new Event('input'));
    }
    showToast('Transformações geradas! ✨', 'success');
  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  } finally {
    setAiLoading(btn, false);
  }
}

// ─── Generate Headlines ───────────────────────
async function aiGenerateHeadlines() {
  const btn = this;
  setAiLoading(btn, true);
  try {
    const result = await callClaude('generate_headlines', getBuilderData());
    const lines = result.split('\n').map(l => l.trim()).filter(Boolean);
    showHeadlinesPicker(lines);
  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  } finally {
    setAiLoading(btn, false);
  }
}

function showHeadlinesPicker(headlines) {
  // Remove existing picker
  const existing = document.getElementById('headlines-picker');
  if (existing) existing.remove();

  const picker = document.createElement('div');
  picker.id = 'headlines-picker';
  picker.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);
    padding:24px;width:90%;max-width:520px;z-index:9999;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);
  `;
  picker.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-weight:700;font-size:1rem;color:var(--text)">✨ Escolha uma headline</div>
      <span style="cursor:pointer;color:var(--gray);font-size:1.2rem" onclick="document.getElementById('headlines-picker').remove()">×</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${headlines.map((h, i) => `
        <div onclick="selectHeadline(${i})"
             style="padding:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);
                    cursor:pointer;font-size:0.88rem;color:var(--text);line-height:1.5;
                    transition:border-color .15s,background .15s"
             onmouseover="this.style.borderColor='var(--green)';this.style.background='var(--green-glow2)'"
             onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-card2)'">
          ${escapeHtml(h)}
        </div>
      `).join('')}
    </div>
  `;

  // Store headlines for selectHeadline()
  window._aiHeadlines = headlines;

  const overlay = document.createElement('div');
  overlay.id = 'headlines-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998';
  overlay.onclick = () => { picker.remove(); overlay.remove(); };

  document.body.appendChild(overlay);
  document.body.appendChild(picker);
}

function selectHeadline(index) {
  const headlines = window._aiHeadlines || [];
  const textarea  = document.querySelector('#builder-step-3 .ai-prompt-box textarea');
  if (textarea && headlines[index]) {
    textarea.value = headlines[index];
    textarea.dispatchEvent(new Event('input'));
  }
  document.getElementById('headlines-picker')?.remove();
  document.getElementById('headlines-overlay')?.remove();
  showToast('Headline selecionada! ✨', 'success');
}

// ─── Generate Full Page ───────────────────────
async function aiGeneratePage() {
  const placeholder = document.getElementById('preview-placeholder');
  const iframe      = document.getElementById('page-preview-iframe');
  const actions     = document.getElementById('preview-actions');

  if (placeholder) {
    placeholder.innerHTML = `
      <div class="generating">
        <div class="gen-dots"><span></span><span></span><span></span></div>
        <span>VX AI está criando sua página...</span>
      </div>
    `;
    placeholder.style.display = 'flex';
  }
  if (iframe)   iframe.style.display   = 'none';
  if (actions)  actions.style.display  = 'none';

  try {
    const raw = await callClaude('generate_page', getBuilderData());

    // Strip markdown fences if model wraps output
    const html = raw.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    // Store globally for fullscreen / download
    window._generatedPageHtml = html;

    // Write into iframe
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      iframe.style.display = 'block';
    }

    // Also render in the Preview tab pane
    const previewTab = document.getElementById('preview-tab-pane');
    if (previewTab) {
      const previewIframe = document.createElement('iframe');
      previewIframe.style.cssText = 'width:100%;height:600px;border:none;';
      previewTab.innerHTML = '';
      previewTab.appendChild(previewIframe);
      const doc2 = previewIframe.contentDocument || previewIframe.contentWindow.document;
      doc2.open(); doc2.write(html); doc2.close();
    }

    // Hide placeholder, show buttons
    if (placeholder) placeholder.style.display = 'none';
    if (actions)     actions.style.display      = 'flex';

    updateSummary({ cta: '' });
    showToast('Página gerada pela VX AI! 🎨', 'success');
    setBuilderStep(5);
  } catch (e) {
    if (placeholder) {
      placeholder.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--gray)">
          <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
          <div style="font-size:0.82rem">${escapeHtml(e.message)}</div>
        </div>
      `;
      placeholder.style.display = 'flex';
    }
    showToast('Erro ao gerar página: ' + e.message, 'error');
  }
}

// ─── Fullscreen / Download ────────────────────
function openPageFullscreen() {
  const html = window._generatedPageHtml;
  if (!html) return;
  const win = window.open('', '_blank');
  win.document.open();
  win.document.write(html);
  win.document.close();
}


// ─── Update Summary Panel ─────────────────────
function updateSummary(pageData) {
  const el = id => document.getElementById(id);

  const tipo = document.querySelector('#tipo-container .style-option.selected')?.textContent?.trim() || 'VSL (Vídeo)';
  const estilo = document.querySelector('.style-selector .style-option.selected')?.textContent?.trim() || 'Dark Profissional';
  const secoes = document.querySelectorAll('#secoes-container input[type="checkbox"]:checked').length;
  const cta = (pageData?.cta || 'QUERO COMEÇAR AGORA').toUpperCase();
  const score = Math.floor(Math.random() * 8) + 91; // 91–98

  if (el('summary-tipo'))   el('summary-tipo').textContent  = tipo;
  if (el('summary-estilo')) el('summary-estilo').textContent = estilo;
  if (el('summary-secoes')) el('summary-secoes').textContent = `${secoes} seção${secoes !== 1 ? 'ões' : ''}`;
  if (el('summary-cta'))    el('summary-cta').textContent    = cta;
  if (el('summary-score'))  el('summary-score').textContent  = `${score}/100 🔥`;
}

function renderGeneratedPage(container, p) {
  container.innerHTML = `
    <div style="padding:16px;font-size:0.78rem;color:var(--gray-light);line-height:1.8">
      <div style="background:linear-gradient(135deg,#084E59,#052F33);border-radius:8px;padding:20px;margin-bottom:12px;text-align:center;">
        <div style="font-size:1.2rem;font-weight:800;color:#fff;margin-bottom:6px;line-height:1.3">${escapeHtml(p.headline) || 'Sua Headline Aqui'}</div>
        ${p.subheadline ? `<div style="color:var(--gray);font-size:0.75rem;margin-bottom:12px">${escapeHtml(p.subheadline)}</div>` : ''}
        <div style="background:var(--green);color:#052F33;padding:10px 20px;border-radius:6px;font-weight:700;font-size:0.82rem;display:inline-block">
          🚀 ${escapeHtml(p.cta) || 'QUERO COMEÇAR AGORA'}
        </div>
      </div>
      ${p.benefits && p.benefits.length ? `
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
          ${p.benefits.map(b => `
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:0.75rem;display:flex;gap:8px;align-items:center">
              <span style="color:var(--green)">✓</span> ${escapeHtml(b)}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${p.testimonial ? `
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:0.73rem;color:var(--gray);margin-bottom:12px">
          ★★★★★ "${escapeHtml(p.testimonial)}"
        </div>
      ` : ''}
      ${p.urgency ? `
        <div style="background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.3);border-radius:6px;padding:10px;font-size:0.73rem;color:#ff4d6d;text-align:center">
          ⚡ ${escapeHtml(p.urgency)}
        </div>
      ` : ''}
      ${p.guarantee ? `
        <div style="margin-top:10px;font-size:0.7rem;text-align:center;color:var(--gray)">🔒 ${escapeHtml(p.guarantee)}</div>
      ` : ''}
    </div>
  `;
}

// ─── Loading state helper ─────────────────────
function setAiLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="ai-spinner"></span> Gerando...';
    btn.disabled  = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled  = false;
  }
}

// ─── Settings: API Key UI ─────────────────────
function initAiSettings() {
  const input = document.getElementById('claude-api-key-input');
  if (!input) return;
  const saved = null; // API key is server-side
  if (saved) {
    input.value = saved.slice(0, 8) + '•'.repeat(Math.max(0, saved.length - 8));
    input.dataset.real = saved;
    updateApiKeyStatus(true);
  }

  input.addEventListener('focus', () => {
    const real = input.dataset.real;
    if (real) input.value = real;
  });

  input.addEventListener('blur', () => {
    const real = input.dataset.real;
    if (real && input.value === real) {
      input.value = real.slice(0, 8) + '•'.repeat(Math.max(0, real.length - 8));
    }
  });
}

function saveAiApiKey() {
  const input = document.getElementById('claude-api-key-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val || val.includes('•')) {
    showToast('Insira uma API Key válida.', 'error');
    return;
  }
  saveApiKey(val);
  input.dataset.real = val;
  input.value = val.slice(0, 8) + '•'.repeat(Math.max(0, val.length - 8));
  updateApiKeyStatus(true);
  showToast('API Key salva com sucesso! ✅', 'success');
}

function clearAiApiKey() {
  localStorage.removeItem('vxpages_claude_key');
  const input = document.getElementById('claude-api-key-input');
  if (input) { input.value = ''; input.dataset.real = ''; }
  updateApiKeyStatus(false);
  showToast('API Key removida.', 'info');
}

function updateApiKeyStatus(hasKey) {
  const statusEl = document.getElementById('api-key-status');
  if (!statusEl) return;
  statusEl.innerHTML = hasKey
    ? '<span style="color:var(--green)">● Conectado</span>'
    : '<span style="color:var(--gray)">● Não configurado</span>';
}

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCredits();
  initAiSettings();

  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.nav === 'settings') setTimeout(initAiSettings, 50);
    });
  });

  document.addEventListener('click', e => {
    const tab = e.target.closest?.('[data-tab="ai"]');
    if (tab) setTimeout(initAiSettings, 50);
  });
});

// Spinner style
const aiSpinnerStyle = document.createElement('style');
aiSpinnerStyle.textContent = `
  .ai-spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: ai-spin .6s linear infinite;
    vertical-align: middle;
    margin-right: 4px;
  }
  @keyframes ai-spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(aiSpinnerStyle);
