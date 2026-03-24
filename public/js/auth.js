/* =============================================
   VX PAGES — Auth (multi-page)
   ============================================= */

// ─── CONFIGURAÇÃO ────────────────────────────
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

// ─── Auth guard (usado em /dash) ─────────────
// Redireciona para /login se não há sessão válida.
function requireAuth() {
  const user = loadSession();
  if (!user) {
    window.location.replace('/login');
    return null;
  }
  currentUser = user;
  return user;
}

// ─── Callback do Google ───────────────────────
function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  if (!payload) {
    showToast('Falha ao autenticar. Tente novamente.', 'error');
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
  window.location.href = '/dash';
}

// ─── Inicializar dados no dashboard ──────────
// Chamada automaticamente após requireAuth() validar a sessão.
function initDashUser() {
  if (!currentUser) return;

  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name');
  const emailEl  = document.getElementById('user-email');
  const topGreet = document.querySelector('#section-dashboard .welcome-greeting');

  if (avatarEl) {
    if (currentUser.picture) {
      const img = document.createElement('img');
      img.src   = currentUser.picture;
      img.alt   = currentUser.given || '';
      img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover';
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = currentUser.given?.[0]?.toUpperCase() || 'U';
    }
  }
  if (nameEl)   nameEl.textContent   = currentUser.name;
  if (emailEl)  emailEl.textContent  = currentUser.email;
  if (topGreet) topGreet.textContent = `Olá, ${currentUser.given}! 👋`;

  // Garante que o nav item correto fica ativo
  if (typeof navigate === 'function') navigate('dashboard');

  showToast(`Bem-vindo, ${currentUser.given}! 🚀`, 'success');
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
  if (currentUser) initDashUser();
});
