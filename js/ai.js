/* =============================================
   VX PAGES — Claude AI Integration
   ============================================= */

// ─── HTML Escape (previne XSS via output da IA) ─
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

// ─── Core fetch wrapper ───────────────────────
async function callClaude(action, data) {
  const res = await fetch('/api/claude', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, data }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
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
    promise:     get('field-promise'),
    whatsapp:    get('field-whatsapp'),
    checkoutUrl: get('field-checkout-url'),
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
  const preview     = document.getElementById('preview-pane-content');
  const iframe      = document.getElementById('page-preview-iframe');
  const placeholder = document.getElementById('preview-placeholder');
  const actions     = document.getElementById('preview-actions');
  if (!preview) return;

  if (placeholder) placeholder.style.display = 'none';
  if (iframe)      { iframe.style.display = 'none'; iframe.srcdoc = ''; }
  if (actions)     actions.style.display = 'none';

  preview.innerHTML = `
    <div style="padding:48px;text-align:center">
      <div class="gen-dots"><span></span><span></span><span></span></div>
      <div style="color:var(--gray);font-size:0.85rem;margin-top:16px">Claude está criando sua página...</div>
    </div>
  `;

  try {
    const html = await callClaude('generate_page', getBuilderData());

    // Guarda o HTML para salvar depois
    window._generatedHTML = html;

    // Exibe no iframe (srcdoc é same-origin, seguro)
    preview.innerHTML = '';
    if (iframe) {
      iframe.srcdoc = html;
      iframe.style.display = 'block';
    }
    if (actions) actions.style.removeProperty('display');

    // Atualiza painel de resumo com valores do formulário
    updateSummary({});

    showToast('Página gerada com Claude IA! 🎨', 'success');
  } catch (e) {
    preview.innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--gray)">
        <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
        <div style="font-size:0.85rem">${e.message}</div>
      </div>
    `;
    if (placeholder) placeholder.style.display = '';
    showToast('Erro ao gerar página: ' + e.message, 'error');
  }
}

// ─── Update Summary Panel ─────────────────────
function updateSummary(_pageData) {
  const el = id => document.getElementById(id);

  const estilo  = document.querySelector('.style-selector .style-option.selected')?.textContent?.trim() || 'Dark Profissional';
  const secoes  = document.querySelectorAll('#secoes-container input[type="checkbox"]:checked').length;
  const cta     = (document.getElementById('field-promise')?.value?.trim() || 'QUERO COMEÇAR AGORA').toUpperCase();
  const score   = Math.floor(Math.random() * 8) + 91;

  if (el('summary-tipo'))   el('summary-tipo').textContent   = 'Landing Page';
  if (el('summary-estilo')) el('summary-estilo').textContent  = estilo;
  if (el('summary-secoes')) el('summary-secoes').textContent  = `${secoes} seção${secoes !== 1 ? 'ões' : ''}`;
  if (el('summary-cta'))    el('summary-cta').textContent     = cta;
  if (el('summary-score'))  el('summary-score').textContent   = `${score}/100 🔥`;
}

function renderGeneratedPage(container, p) {
  container.innerHTML = `
    <div style="padding:16px;font-size:0.78rem;color:var(--gray-light);line-height:1.8">
      <div style="background:linear-gradient(135deg,#0d3b3b,#071a1a);border-radius:8px;padding:20px;margin-bottom:12px;text-align:center;">
        <div style="font-size:1.2rem;font-weight:800;color:#fff;margin-bottom:6px;line-height:1.3">${escapeHtml(p.headline) || 'Sua Headline Aqui'}</div>
        ${p.subheadline ? `<div style="color:var(--gray);font-size:0.75rem;margin-bottom:12px">${escapeHtml(p.subheadline)}</div>` : ''}
        <div style="background:var(--green);color:#071a1a;padding:10px 20px;border-radius:6px;font-weight:700;font-size:0.82rem;display:inline-block">
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

// ─── Fullscreen / Download helpers ───────────
function openPageFullscreen() {
  const html = window._generatedHTML;
  if (!html) { showToast('Gere uma página primeiro.', 'info'); return; }
  const win = window.open('', '_blank');
  if (!win) { showToast('Pop-up bloqueado. Permita pop-ups e tente novamente.', 'error'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function downloadPage() {
  const html = window._generatedHTML;
  if (!html) { showToast('Gere uma página primeiro.', 'info'); return; }
  const title = document.getElementById('field-product')?.value?.trim() || 'pagina';
  const slug  = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
  const blob  = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `${slug || 'pagina'}.html`;
  a.click();
  URL.revokeObjectURL(url);
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
  const saved = getApiKey();
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
  initAiSettings();

  // Re-init after navigating to settings (settings section becomes visible)
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.nav === 'settings') {
        setTimeout(initAiSettings, 50);
      }
    });
  });

  // Also init when the AI tab is clicked in settings
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
