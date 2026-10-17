// First-visit language chooser.
// Add this line just before </head> on EVERY page:
// <script src="lang-choice.js"></script>
(function () {
  let saved = null;
  try { saved = localStorage.getItem('selectedLang'); } catch (e) {}

  const style = document.createElement('style');
  style.textContent = `
    #langBtn, .lang-container { display: none !important; }
    #langChooser { position: fixed; inset: 0; z-index: 99999; background: #2E7D32;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      font-family: system-ui, -apple-system, sans-serif; }
    #langChooser .lc-card { background: #fff; color: #222; border-radius: 18px;
      padding: 28px 22px; width: 100%; max-width: 360px; text-align: center; }
    #langChooser .lc-logo { font-size: 44px; }
    #langChooser h2 { margin: 6px 0 4px; font-size: 20px; color: #2E7D32; }
    #langChooser p { margin: 4px 0 6px; color: #666; font-size: 14px; }
    #langChooser button { display: block; width: 100%; margin-top: 12px; padding: 14px;
      border: 0; border-radius: 12px; background: #2E7D32; color: #fff;
      font-size: 17px; font-weight: bold; cursor: pointer; }
    #langChooser button[data-lang="om"] { background: #FBC02D; color: #222; }
  `;
  document.head.appendChild(style);

  // Already chosen: nothing more to show
  if (saved === 'en' || saved === 'om') return;

  document.addEventListener('DOMContentLoaded', function () {
    const box = document.createElement('div');
    box.id = 'langChooser';
    box.innerHTML = `
      <div class="lc-card">
        <div class="lc-logo">🌱</div>
        <h2>Qonna Dijitaalawaa Shaggar</h2>
        <p>Choose your language</p>
        <p>Afaan filadhu</p>
        <button type="button" data-lang="en">English</button>
        <button type="button" data-lang="om">Afaan Oromoo</button>
      </div>`;
    document.body.appendChild(box);

    box.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        let ok = true;
        try { localStorage.setItem('selectedLang', b.dataset.lang); } catch (e) { ok = false; }
        if (ok) location.reload();
        else box.remove();
      });
    });
  });
})();
