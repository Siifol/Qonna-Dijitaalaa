// Login gate: every page except profile.html needs a logged-in user.
// Add this line just before </head> on EVERY protected page (after lang-choice.js):
// <script src="auth-gate.js"></script>
(function () {
  const API = "https://qonna-dijitaalaa.onrender.com";
  const page = location.pathname.split('/').pop() || 'index.html';
  const openPages = ['profile.html', 'login.html', 'register.html'];
  if (openPages.indexOf(page) !== -1) return;

  const lang = localStorage.getItem('selectedLang') === 'om' ? 'om' : 'en';
  const t = (en, om) => (lang === 'om' ? om : en);

  const style = document.createElement('style');
  style.textContent = `
    #authGate { position: fixed; inset: 0; z-index: 99998; background: #1b3a1d;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      font-family: system-ui, -apple-system, sans-serif; }
    #authGate .ag-card { background: #fff; color: #222; border-radius: 18px; padding: 28px 22px;
      max-width: 340px; width: 100%; text-align: center; box-shadow: 0 14px 40px rgba(0,0,0,.35);
      animation: agRise .5s ease-out both; }
    #authGate .ag-icon { font-size: 48px; display: inline-block; animation: agBob 2.5s ease-in-out infinite; }
    #authGate h2 { color: #2E7D32; font-size: 19px; margin: 8px 0 4px; }
    #authGate p { color: #666; font-size: 14px; margin: 4px 0; }
    #authGate a { display: block; margin-top: 14px; padding: 14px; border-radius: 14px;
      background: #2E7D32; color: #fff; font-weight: bold; text-decoration: none; font-size: 16px;
      box-shadow: 0 6px 14px rgba(46,125,50,.35); }
    @keyframes agRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
    @keyframes agBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @media (prefers-reduced-motion: reduce) { #authGate * { animation: none !important; } }
  `;
  document.head.appendChild(style);

  function showGate() {
    const box = document.createElement('div');
    box.id = 'authGate';
    box.innerHTML = `
      <div class="ag-card">
        <div class="ag-icon">🔒</div>
        <h2>${t("Login to see details", "Odeeffannoo ilaaluuf seeni")}</h2>
        <p>${t("Log in or create an account first.", "Dura seenuu ykn akkaawuntii uumi.")}</p>
        <a href="profile.html?next=${encodeURIComponent(page)}">${t("Login / Register", "Seeni / Galmaa'i")}</a>
      </div>`;
    document.body.appendChild(box);
  }

  let user = null;
  try { user = JSON.parse(localStorage.getItem('activeUser') || 'null'); } catch (e) {}

  if (!user || !user.token) {
    document.addEventListener('DOMContentLoaded', showGate);
    return;
  }

  // Saved login exists: check it is still valid on the server
  fetch(API + '/profile', { headers: { Authorization: 'Bearer ' + user.token } })
    .then(function (r) {
      if (r.status === 401 || r.status === 403) {
        try { localStorage.removeItem('activeUser'); } catch (e) {}
        document.addEventListener('DOMContentLoaded', showGate);
      }
    })
    .catch(function () { /* no network: keep the page open */ });
})();
