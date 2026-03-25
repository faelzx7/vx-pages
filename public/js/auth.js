/* =============================================
   VX PAGES — Auth (multi-page)
   ============================================= */

// ─── CONFIGURAÇÃO ────────────────────────────
const GOOGLE_CLIENT_ID = '57647740881-o82reg3ddlgt34n8feple9bs2l36evn7.apps.googleusercontent.com';

// ─── Estado do usuário ────────────────────────
// Use window.window.currentUser so other scripts (app.js, ai.js) can access it.
window.window.currentUser = null;

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
  window.currentUser = null;
}

// ─── Auth guard (usado em /dash) ─────────────
// Redireciona para /login se não há sessão válida.
function requireAuth() {
  const user = loadSession();
  if (!user) {
    window.location.replace('/login');
    return null;
  }
  window.currentUser = user;
  return user;
}

// ─── Callback do Google ───────────────────────
async function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  if (!payload) {
    showToast('Falha ao autenticar. Tente novamente.', 'error');
    return;
  }

  window.currentUser = {
    name:    payload.name,
    email:   payload.email,
    picture: payload.picture,
    given:   payload.given_name,
    exp:     payload.exp,
    token:   response.credential,
  };

  saveSession(window.currentUser);

  // Sync user + credits to Supabase
  try {
    await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: window.currentUser.email, name: window.currentUser.name, picture: window.currentUser.picture }),
    });
  } catch {}

  window.location.href = '/dash';
}

// ─── Inicializar dados no dashboard ──────────
// Chamada automaticamente após requireAuth() validar a sessão.
function initDashUser() {
  if (!window.currentUser) return;

  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name');
  const emailEl  = document.getElementById('user-email');
  const topGreet = document.querySelector('#section-dashboard .welcome-greeting');

  if (avatarEl) {
    if (window.currentUser.picture) {
      const img = document.createElement('img');
      img.src   = window.currentUser.picture;
      img.alt   = window.currentUser.given || '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      img.onload = () => { avatarEl.style.background = 'none'; };
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = window.currentUser.given?.[0]?.toUpperCase() || 'U';
    }
  }
  if (nameEl)   nameEl.textContent   = window.currentUser.name;
  if (emailEl)  emailEl.textContent  = window.currentUser.email;
  if (topGreet) topGreet.textContent = `Olá, ${window.currentUser.given}! 👋`;

  // Preenche campos de perfil nas configurações
  const settingsName  = document.getElementById('settings-name-input');
  const settingsEmail = document.getElementById('settings-email-input');
  if (settingsName)  settingsName.value  = window.currentUser.name;
  if (settingsEmail) settingsEmail.value = window.currentUser.email;

  // Garante que o nav item correto fica ativo
  if (typeof navigate === 'function') navigate('dashboard');

  showToast(`Bem-vindo, ${window.currentUser.given}! 🚀`, 'success');
}

// ─── Sign Out ─────────────────────────────────
function signOut() {
  if (typeof google !== 'undefined') {
    google.accounts.id.disableAutoSelect();
  }
  clearSession();
  window.location.replace('/login');
}

// ─── Bootstrap no dashboard ──────────────────
// dash.html chama requireAuth() antes deste DOMContentLoaded.
// Se o usuário passou pelo guard, inicializa os dados de UI.
document.addEventListener('DOMContentLoaded', () => {
  if (window.currentUser) initDashUser();
});
