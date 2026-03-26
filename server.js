/* =============================================
   VX PAGES — Express Server
   Haiku  → tarefas rápidas (headlines, copy, FAQ)
   Sonnet → geração completa de página
   Imagen → imagens via Google
   ============================================= */

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const Anthropic  = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit  = require('express-rate-limit');
const crypto     = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Load generate_page prompt from file (fallback to inline if missing)
let GENERATE_PAGE_PROMPT = '';
try {
  GENERATE_PAGE_PROMPT = fs.readFileSync(path.join(__dirname, 'generate_page_prompt.md'), 'utf8');
} catch {
  GENERATE_PAGE_PROMPT = 'Gere uma landing page HTML completa e autossuficiente.';
}

const app    = express();
const PORT   = process.env.PORT || 4000;
const CLAUDE = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GEMINI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// AbacatePay — chave para chamadas REST diretas
const ABACATE_KEY = process.env.ABACATEPAY_API_KEY || null;
const ABACATE_URL = 'https://api.abacatepay.com/v1';

async function abacatePost(path, body) {
  const res = await fetch(`${ABACATE_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ABACATE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AbacatePay ${res.status}: ${text}`);
  }
  return res.json();
}

// Preços em centavos. Configuráveis via env vars no Railway.
const PLANS = {
  anual: { price: parseInt(process.env.PLAN_PRICE_ANUAL || '29700', 10), name: 'VX Pages — Plano Anual Completo' },
};
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Modelos ──────────────────────────────────
const MODEL_FAST    = 'claude-haiku-4-5-20251001'; // ~R$0,02/chamada
const MODEL_COMPLEX = 'claude-sonnet-4-6';    // ~R$0,07/chamada
const MODEL_IMAGE   = 'imagen-3.0-generate-002'; // Google Imagen 3

// Ações que usam Sonnet (mais complexas)
const COMPLEX_ACTIONS = new Set(['generate_page']);

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY não definida no .env');
}
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY não definida no .env — geração de imagens desativada');
}
 
// ─── System Prompt Base ───────────────────────
// Expertise completa injetada em TODAS as chamadas.
// Os prompts específicos de cada action complementam este — não repetem.
 
const BASE_SYSTEM_PROMPT = `Você é o assistente de inteligência do VX Pages, plataforma brasileira de criação de sites, landing pages e páginas de vendas desenvolvida pela VX Hub. Seu papel é ajudar usuários a criarem presença digital profissional e de alta conversão — mesmo sem conhecimento técnico.
 
Você combina quatro áreas de especialização:
 
## COPYWRITING E PERSUASÃO
- Estruturas: AIDA, PAS (Problema→Agitação→Solução), BAB (Before/After/Bridge), 4Ps
- Gatilhos mentais: escassez, urgência, prova social, autoridade, reciprocidade, especificidade, exclusividade
- Headlines: números, promessa específica, dor do avatar, curiosidade
- CTAs orientados a benefício ("Quero minha página hoje", não "Clique aqui")
- Copy para tráfego frio, morno e quente
- Você escreve focado em benefício, nunca em feature
- Português brasileiro direto, sem rebuscamento
 
## DESENVOLVIMENTO WEB
- HTML5 semântico, CSS moderno (Flexbox, Grid, variáveis CSS, animações)
- JavaScript vanilla: formulários, validações, scroll behavior, modais
- Mobile-first com media queries e unidades relativas
- Performance: lazy loading, Core Web Vitals (LCP, FID, CLS), fontes com font-display:swap
- Estruturas de alta conversão por tipo de página:
  • Landing page: hero → problema → solução → prova social → oferta → FAQ → CTA final
  • Página de vendas: jornada emocional antes do preço
  • Página de captura: uma promessa, um campo, zero distração
  • Página de obrigado: próximo passo claro, upsell ou engajamento
- UX: hierarquia visual, white space, contraste WCAG AA, formulários curtos
- Código limpo, comentado, com variáveis CSS para fácil personalização
 
## ESTRATÉGIA DIGITAL
- Funis: topo (consciência) → meio (consideração) → fundo (decisão)
- SEO on-page: H1 único, meta title/description, URLs amigáveis, alt text, schema markup local
- Integrações: Pixel Meta (PageView/Lead/Purchase), GA4, GTM, webhooks, WhatsApp (wa.me)
- Estratégia por nicho:
  • Negócio local (clínica, academia, restaurante): Google Meu Negócio + captura de leads locais
  • Infoprodutor: página de vendas longa + área de membros
  • Freelancer: portfólio + captação de orçamento
  • SaaS: landing de conversão + trial/demo
- Para cada projeto identifica: objetivo principal da página, fonte de tráfego, ação ideal do visitante
 
## SEGURANÇA E LGPD
- Validação de inputs no frontend E backend — nunca confiar só no frontend
- Sanitização contra XSS, proteção CSRF em formulários
- Nunca expor API keys no frontend — sempre variáveis de ambiente no servidor
- HTTPS obrigatório — alerta quando mencionar HTTP
- LGPD: política de privacidade linkada, checkbox de consentimento, banner de cookies para pixels
- Headers de segurança HTTP (CSP, X-Frame-Options, Referrer-Policy)
- Orienta sobre riscos sempre com a solução junto — nunca só o problema
 
## COMPORTAMENTO
- Adapta complexidade técnica ao nível do usuário
- Entrega resultado prático: código funcionando, texto pronto para usar
- Sugere melhorias proativamente quando identifica oportunidade de conversão
- Pensa em conversão primeiro, estética depois
- NUNCA gera código malicioso, páginas enganosas, claims falsos, conteúdo que viole LGPD ou Termos da VX Hub
- NUNCA recomenda black hat SEO`;
 
// ─── Security Headers ─────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // CSP: permite inline scripts/styles (necessário pela estrutura atual do frontend)
  // TODO: migrar para nonce-based CSP para eliminar 'unsafe-inline'
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://accounts.google.com https://play.google.com; " +
    "frame-src https://accounts.google.com https://apis.google.com;"
  );
  next();
});

// ─── Bloquear arquivos sensíveis ──────────────
const BLOCKED_PATHS = ['/server.js', '/package.json', '/package-lock.json', '/.env', '/.gitignore'];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (BLOCKED_PATHS.includes(p) || p.startsWith('/node_modules') || p.startsWith('/.')) {
    return res.status(403).end();
  }
  next();
});

// ─── CORS — mesma origem + produção ───────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers.host;
    const allowed = [
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      `https://${host}`,
      `http://${host}`,
      ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
    ];
    if (!allowed.includes(origin)) {
      return res.status(403).json({ error: 'Origem não permitida.' });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});
 
// ─── Rate Limiting ────────────────────────────
const aiLimiter = rateLimit({
  windowMs:        10 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
});
 
app.use(express.json({ limit: '50kb' }));

// ─── Servir arquivos estáticos de public/ ─────
// Apenas arquivos dentro de public/ são expostos — server.js, .env, etc. nunca são acessíveis.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ─── Supabase: User sync ──────────────────────
app.post('/api/user/sync', async (req, res) => {
  const { email, name, picture } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  try {
    // Upsert user
    await supabase.from('users').upsert({ email, name, picture }, { onConflict: 'email', ignoreDuplicates: false });

    // Ensure credits row exists
    const { data: existing } = await supabase.from('credits').select('email').eq('email', email).single();
    if (!existing) {
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1, 1);
      await supabase.from('credits').insert({ email, used: 0, limit: 15, reset_date: resetDate.toISOString().slice(0, 10) });
    }

    // Get credits
    const { data: credits } = await supabase.from('credits').select('*').eq('email', email).single();
    res.json({ ok: true, credits });
  } catch (err) {
    console.error('[/api/user/sync]', err.message);
    res.status(500).json({ error: 'Erro ao sincronizar usuário.' });
  }
});

// ─── Supabase: Credits ────────────────────────
app.get('/api/credits', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  try {
    const { data } = await supabase.from('credits').select('*').eq('email', email).single();
    if (!data) return res.json({ used: 0, limit: 15, remaining: 15 });

    // Auto-reset if past reset_date
    if (new Date() >= new Date(data.reset_date)) {
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1, 1);
      await supabase.from('credits').update({ used: 0, reset_date: resetDate.toISOString().slice(0, 10) }).eq('email', email);
      data.used = 0;
    }

    res.json({ used: data.used, limit: data.limit, remaining: data.limit - data.used, reset_date: data.reset_date });
  } catch (err) {
    console.error('[/api/credits GET]', err.message);
    res.status(500).json({ error: 'Erro ao buscar créditos.' });
  }
});

app.post('/api/credits/use', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  try {
    const { data } = await supabase.from('credits').select('*').eq('email', email).single();
    if (!data) return res.status(404).json({ error: 'Créditos não encontrados.' });
    if (data.used >= data.limit) return res.status(402).json({ error: 'Créditos esgotados.', reset_date: data.reset_date });

    await supabase.from('credits').update({ used: data.used + 1, updated_at: new Date().toISOString() }).eq('email', email);
    res.json({ used: data.used + 1, limit: data.limit, remaining: data.limit - data.used - 1 });
  } catch (err) {
    console.error('[/api/credits/use]', err.message);
    res.status(500).json({ error: 'Erro ao usar crédito.' });
  }
});

// ─── Supabase: Pages ──────────────────────────
app.post('/api/pages/save', async (req, res) => {
  const { email, title, html } = req.body || {};
  if (!email || !html) return res.status(400).json({ error: 'Email e HTML obrigatórios.' });
  try {
    const { data, error } = await supabase.from('pages')
      .insert({ email, title: title || 'Página sem título', html })
      .select('id, title, created_at')
      .single();
    if (error) throw error;
    res.json({ ok: true, page: data });
  } catch (err) {
    console.error('[/api/pages/save]', err.message);
    res.status(500).json({ error: 'Erro ao salvar página.' });
  }
});

app.get('/api/pages', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  try {
    const { data, error } = await supabase.from('pages')
      .select('id, title, created_at')
      .eq('email', email)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ pages: data || [] });
  } catch (err) {
    console.error('[/api/pages GET]', err.message);
    res.status(500).json({ error: 'Erro ao buscar páginas.' });
  }
});

app.get('/api/pages/:id/html', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  try {
    const { data, error } = await supabase.from('pages')
      .select('html, title')
      .eq('id', req.params.id)
      .eq('email', email)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Página não encontrada.' });
    res.json({ html: data.html, title: data.title });
  } catch (err) {
    console.error('[/api/pages/:id/html]', err.message);
    res.status(500).json({ error: 'Erro ao buscar página.' });
  }
});

app.delete('/api/pages/:id', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  try {
    await supabase.from('pages').delete().eq('id', req.params.id).eq('email', email);
    res.json({ ok: true });
  } catch (err) {
    console.error('[/api/pages DELETE]', err.message);
    res.status(500).json({ error: 'Erro ao deletar página.' });
  }
});

// ─── Rotas de página ──────────────────────────
app.get('/',         (_req, res) => res.sendFile(path.join(__dirname, 'public', 'pgnvnds.html')));
app.get('/login',    (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dash',     (_req, res) => res.sendFile(path.join(__dirname, 'public', 'dash.html')));
app.get('/pgnvnds',  (_req, res) => res.sendFile(path.join(__dirname, 'public', 'pgnvnds.html')));
app.get('/obrigado', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'obrigado.html')));

// ─── Sanitização de campos ────────────────────
// Remove tags HTML e limita o tamanho por campo
function sanitizeField(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}
 
// ─── Claude Proxy ─────────────────────────────
app.post('/api/claude', aiLimiter, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'IA não configurada no servidor.' });
  }
 
  const { action, data } = req.body;
  if (!action || !data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Parâmetros inválidos.' });
  }

  // Sanitiza todos os campos recebidos do cliente (remove HTML, limita tamanho)
  const s = {
    product:         sanitizeField(data.product),
    niche:           sanitizeField(data.niche),
    audience:        sanitizeField(data.audience),
    transformations: sanitizeField(data.transformations, 1000),
    headline:        sanitizeField(data.headline),
    price:           sanitizeField(data.price, 100),
    style:           sanitizeField(data.style, 50),
    palette:         sanitizeField(data.palette, 50),
    promise:         sanitizeField(data.promise),
    location:        sanitizeField(data.location, 100),
    keyword:         sanitizeField(data.keyword, 100),
    objections:      sanitizeField(data.objections),
    text:            sanitizeField(data.text, 2000),
    goal:            sanitizeField(data.goal),
    tone:            sanitizeField(data.tone, 100),
  };

  try {
    let actionPrompt = '';
    let userPrompt   = '';

    switch (action) {

      case 'suggest_description':
        actionPrompt = `Sua tarefa: escrever uma descrição curta e persuasiva de 2-3 frases.
Foque no benefício principal e desperte curiosidade.
Responda APENAS com a descrição, sem introduções ou explicações.`;

        userPrompt = `Produto/Serviço: ${s.product}
Nicho: ${s.niche}
Público-alvo: ${s.audience}`;
        break;

      case 'generate_transformations':
        actionPrompt = `Sua tarefa: listar transformações concretas no formato "antes → depois".
Seja específico — transformações vagas não convertem.
Responda APENAS com as transformações (uma por linha, sem numeração ou bullets).`;

        userPrompt = `Produto/Serviço: ${s.product}
Nicho: ${s.niche}
Público-alvo: ${s.audience}
Liste 5 transformações concretas que o cliente vai conquistar.`;
        break;

      case 'generate_headlines':
        actionPrompt = `Sua tarefa: criar 3 headlines de alta conversão.
Cada headline deve combinar: benefício claro + elemento de curiosidade ou urgência.
Varie a estrutura: uma com número, uma com pergunta, uma com promessa direta.
Responda APENAS com as 3 headlines, uma por linha, sem numeração ou explicações.`;

        userPrompt = `Produto/Serviço: ${s.product}
Nicho: ${s.niche}
Público-alvo: ${s.audience}
Promessa principal: ${s.promise}`;
        break;

      case 'generate_page':
        actionPrompt = GENERATE_PAGE_PROMPT;

        userPrompt = `Produto/Serviço: ${s.product}
Nicho: ${s.niche}
Público-alvo: ${s.audience}
Transformações prometidas: ${s.transformations}
Headline principal: ${s.headline || '(gerar automaticamente)'}
Texto do CTA: ${s.promise || '(gerar automaticamente)'}
Preço/Oferta: ${s.price || '(não informado)'}
Estilo visual: ${s.style || 'Dark Profissional'}
Paleta de cores: ${s.palette || 'Verde VX (#00FF85)'}
Principais objeções do público: ${s.objections || 'preço, confiança, prazo de resultado'}`;
        break;

      case 'generate_seo':
        actionPrompt = `Sua tarefa: gerar meta title e meta description otimizados para SEO.
Meta title: máximo 60 caracteres, inclui palavra-chave principal.
Meta description: 150-160 caracteres, inclui CTA implícito.
Responda APENAS com JSON: { "title": "...", "description": "..." }`;

        userPrompt = `Produto/Serviço: ${s.product}
Nicho: ${s.niche}
Cidade/Região (se negócio local): ${s.location}
Palavra-chave principal: ${s.keyword}`;
        break;

      case 'generate_faq':
        actionPrompt = `Sua tarefa: gerar perguntas frequentes que quebram objeções de compra.
Foque nas objeções reais do público — preço, confiança, resultado, tempo.
Responda APENAS com JSON: { "faqs": [{ "question": "...", "answer": "..." }] }
Gere 5 FAQs.`;

        userPrompt = `Produto/Serviço: ${s.product}
Nicho: ${s.niche}
Público-alvo: ${s.audience}
Principais objeções conhecidas: ${s.objections || 'preço, confiança, tempo de resultado'}`;
        break;

      case 'improve_copy':
        actionPrompt = `Sua tarefa: melhorar o texto fornecido para aumentar conversão.
Mantenha a essência da mensagem mas torne mais persuasivo, direto e orientado a benefício.
Explique em 1 linha o que você mudou e por quê.
Responda com JSON: { "improved": "texto melhorado", "reason": "explicação da mudança" }`;

        userPrompt = `Texto original: ${s.text}
Objetivo do texto: ${s.goal || 'converter visitante em lead ou comprador'}
Tom desejado: ${s.tone || 'direto e confiante'}`;
        break;

      default:
        return res.status(400).json({ error: 'Ação desconhecida.' });
    }

    const model      = COMPLEX_ACTIONS.has(action) ? MODEL_COMPLEX : MODEL_FAST;
    const maxTokens  = action === 'generate_page' ? 8096 : 1024;
    const fullSystem = `${BASE_SYSTEM_PROMPT}\n\n---\n\n${actionPrompt}`;

    console.log(`[/api/claude] action=${action} model=${model} max_tokens=${maxTokens}`);

    const response = await CLAUDE.messages.create({
      model,
      max_tokens: maxTokens,
      system:     fullSystem,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    res.json({ result: text });

  } catch (err) {
    console.error('[/api/claude]', err.status, err.message);
    const status = err.status || 500;
    res.status(status >= 500 ? 500 : status).json({
      error: status === 429
        ? 'Serviço temporariamente sobrecarregado. Tente em instantes.'
        : status === 401
        ? 'API key inválida. Verifique a configuração no servidor.'
        : 'Erro ao processar sua solicitação.',
    });
  }
});

// ─── Image Generation (Google Imagen) ─────────
app.post('/api/image', aiLimiter, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Geração de imagens não configurada.' });
  }

  const { prompt, niche } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Parâmetros inválidos.' });

  const safePrompt = sanitizeField(prompt, 300);
  const safeNiche  = sanitizeField(niche || '', 100);

  try {
    const model  = GEMINI.getGenerativeModel({ model: MODEL_IMAGE });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Professional marketing hero image for a landing page. ${safeNiche ? 'Niche: ' + safeNiche + '. ' : ''}${safePrompt}. High quality, photorealistic, clean background, no text.` }],
      }],
      generationConfig: { responseModalities: ['IMAGE'] },
    });

    const imagePart = result.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart) return res.status(500).json({ error: 'Imagem não gerada.' });

    res.json({
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    });

  } catch (err) {
    console.error('[/api/image]', err.message);
    res.status(500).json({ error: 'Erro ao gerar imagem.' });
  }
});

// ─── Checkout AbacatePay ──────────────────────
app.post('/api/checkout', async (req, res) => {
  if (!ABACATE_KEY) {
    return res.status(503).json({ error: 'Pagamentos não configurados.' });
  }

  const { name, email, cellphone, taxId } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  }

  try {
    // Cria cobrança v1 com produto inline
    const billing = await abacatePost('/billing/create', {
      frequency: 'ONE_TIME',
      methods:   ['PIX', 'CARD'],
      products:  [{ externalId: 'vxpages-anual', name: 'VX Pages — Plano Anual Completo', quantity: 1, price: parseInt(process.env.PLAN_PRICE_ANUAL || '29700', 10) }],
      customer:  { name, email, cellphone, ...(taxId && { taxId }) },
      returnUrl:     `${BASE_URL}/dash`,
      completionUrl: `${BASE_URL}/obrigado`,
    });

    console.log('[/api/checkout] AbacatePay response:', JSON.stringify(billing));

    const url = billing.data?.url || billing.url;
    if (!url) throw new Error(`AbacatePay sem URL: ${JSON.stringify(billing)}`);

    res.json({ url });
  } catch (err) {
    console.error('[/api/checkout]', err.message);
    res.status(500).json({ error: 'Erro ao criar cobrança.' });
  }
});

// ─── Webhook AbacatePay ───────────────────────
app.post('/api/webhook/abacatepay', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret    = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-webhook-signature'];

  if (secret && signature) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');
    if (signature !== expected) {
      return res.status(401).end();
    }
  }

  try {
    const event = JSON.parse(req.body.toString());
    console.log(`[webhook] event=${event.event} id=${event.data?.id}`);

    if (event.event === 'billing.paid' || event.event === 'checkout.completed') {
      const email = event.data?.customer?.email;
      console.log(`[webhook] Pagamento confirmado: ${email}`);
      if (email) {
        // Marca usuário como pago
        await supabase.from('users').upsert({ email, plan: 'paid' }, { onConflict: 'email' });
        // Garante créditos existem e reseta se necessário
        const resetDate = new Date();
        resetDate.setMonth(resetDate.getMonth() + 1, 1);
        await supabase.from('credits').upsert(
          { email, used: 0, limit: 15, reset_date: resetDate.toISOString().slice(0, 10) },
          { onConflict: 'email' }
        );
        console.log(`[webhook] Usuário ${email} ativado com plano paid.`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] parse error', err.message);
    res.status(400).end();
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ VX Pages rodando em http://localhost:${PORT}`);
  console.log(`   Haiku  (rápido): ${MODEL_FAST}`);
  console.log(`   Sonnet (página): ${MODEL_COMPLEX}`);
  console.log(`   Imagen (imagem): ${MODEL_IMAGE}`);
  console.log(`   AbacatePay:      ${ABACATE_KEY ? 'configurado ✅' : 'não configurado ⚠️'}`);
  console.log(`   Plano anual:     R$${(PLANS.anual.price/100).toFixed(2)}\n`);
});