/* =============================================
   VX PAGES — Google Auth (Real OAuth 2.0)
   ============================================= */

// ─── CONFIGURAÇÃO ────────────────────────────
// Substitua pelo seu Client ID do Google Cloud Console
const GOOGLE_CLIENT_ID = '57647740881-o82reg3ddlgt34n8feple9bs2l36evn7.apps.googleusercontent.com';

// ─── Estado do usuário ────────────────────────
let currentUser = null;

// ─── Decode JWT (sem biblioteca externa) ─────
function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ─── Persistência de sessão ──────────────────
function saveSession(user) {
  localStorage.setItem('vxpages_user', JSON.stringify(user));
}

function loadSession() {
  try {
    const raw = localStorage.getItem('vxpages_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    // Valida se o token ainda é válido (exp em segundos)
    if (user.exp && Date.now() / 1000 > user.exp) {
      clearSession();
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('vxpages_user');
  currentUser = null;
}

// ─── Callback do Google ───────────────────────
function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  if (!payload) {
    showAuthError('Falha ao autenticar. Tente novamente.');
    return;
  }

  currentUser = {
    name:    payload.name,
    email:   payload.email,
    picture: payload.picture,
    given:   payload.given_name,
    exp:     payload.exp,
    token:   response.credential,
  };

  saveSession(currentUser);
  enterApp();
}

// ─── Entrar no app ────────────────────────────
function enterApp() {
  if (!currentUser) return;

  // Atualiza sidebar com dados reais
  const avatarEl   = document.getElementById('user-avatar');
  const nameEl     = document.getElementById('user-name');
  const emailEl    = document.getElementById('user-email');
  const topGreet   = document.querySelector('#section-dashboard .welcome-greeting');

  if (avatarEl) {
    if (currentUser.picture) {
      avatarEl.innerHTML = `<img src="${currentUser.picture}" alt="${currentUser.given}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
      avatarEl.textContent = currentUser.given?.[0]?.toUpperCase() || 'U';
    }
  }
  if (nameEl)    nameEl.textContent  = currentUser.name;
  if (emailEl)   emailEl.textContent = currentUser.email;
  if (topGreet)  topGreet.textContent = `Olá, ${currentUser.given}! 👋`;

  // Esconde splash, mostra app
  const splash = document.getElementById('splash');
  const app    = document.getElementById('app');
  splash.classList.add('hidden');
  app.classList.add('visible');

  navigate('dashboard');
  showToast(`Bem-vindo, ${currentUser.given}! 🚀`, 'success');
}

// ─── Sign Out ────────────────────────────────
function signOut() {
  google.accounts.id.disableAutoSelect();
  clearSession();

  const splash = document.getElementById('splash');
  const app    = document.getElementById('app');

  // Restaura botão
  resetGoogleButton();

  app.classList.remove('visible');
  splash.classList.remove('hidden');

  showToast('Sessão encerrada.', 'info');
}

// ─── Resetar botão Google ────────────────────
function resetGoogleButton() {
  const btn = document.getElementById('login-btn');
  if (!btn) return;
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    Continuar com Google
  `;
  btn.disabled = false;
  btn.style.opacity = '1';
}

function showAuthError(msg) {
  showToast(msg, 'error');
}

// ─── Init Google Identity Services ───────────
function initGoogleAuth() {
  // file:// e localhost não suportam OAuth — entra direto com sessão local
  // ATENÇÃO: este bypass só deve existir em desenvolvimento local.
  // REMOVER antes de fazer deploy em produção pública.
  const isLocal = window.location.hostname === '127.0.0.1';
  if (isLocal) {
    if (!loadSession()) {
      const exp = Math.floor(Date.now() / 1000) + (8 * 60 * 60); // expira em 8h
      saveSession({ name: 'Rafael Almeida', email: 'rafael@vxpages.com', given: 'Rafael', picture: null, exp });
    }
    currentUser = loadSession();
    if (currentUser) { enterApp(); return; }
  }

  if (typeof google === 'undefined') {
    setTimeout(initGoogleAuth, 300);
    return;
  }

  google.accounts.id.initialize({
    client_id:             GOOGLE_CLIENT_ID,
    callback:              handleCredentialResponse,
    auto_select:           false,
    cancel_on_tap_outside: true,
  });

  // Renderiza o botão real do Google dentro do container invisível
  google.accounts.id.renderButton(
    document.getElementById('g-signin-hidden'),
    { theme: 'outline', size: 'large', type: 'standard', width: 300 }
  );

  // Verifica sessão salva
  const saved = loadSession();
  if (saved) {
    currentUser = saved;
    enterApp();
    return;
  }
}

// ─── Clique no botão Google ───────────────────
function doLogin() {
  // Clica no botão real do Google renderizado de forma invisível
  const googleBtn = document.querySelector('#g-signin-hidden div[role="button"]');
  if (googleBtn) {
    googleBtn.click();
  } else {
    showToast('Aguardando Google carregar, tente novamente.', 'info');
  }
}

// ─── Bootstrap ───────────────────────────────
document.addEventListener('DOMContentLoaded', initGoogleAuth);
