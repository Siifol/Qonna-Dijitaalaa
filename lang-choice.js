// Language chooser: shows when someone ENTERS the site (icon, link, typed address).
// Moving between pages inside the site keeps the chosen language.
// Add this line just before </head> on EVERY page:
// <script src="lang-choice.js"></script>
(function () {
  // The 🌐 button is always hidden; language is changed by the chooser or Settings
  const style = document.createElement('style');
  style.textContent = `
    #langBtn, .lang-container { display: none !important; }

    #langChooser { position: fixed; inset: 0; z-index: 99999; overflow: hidden;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(180deg, #81d4fa 0%, #e8f5e9 58%, #7cb342 59%, #33691e 100%); }

    /* Scene */
    #langChooser .lc-sun { position: absolute; top: 7%; right: 10%; width: 74px; height: 74px;
      border-radius: 50%; background: radial-gradient(circle, #fff59d 45%, #fbc02d 75%);
      box-shadow: 0 0 40px #fff176; animation: lcPulse 4s ease-in-out infinite; }
    #langChooser .lc-cloud { position: absolute; font-size: 42px; opacity: .92;
      left: -90px; animation: lcDrift 26s linear infinite; }
    #langChooser .lc-field { position: absolute; left: 0; right: 0; bottom: 4%;
      display: flex; justify-content: space-around; align-items: flex-end; font-size: 34px; }
    #langChooser .lc-field span { display: inline-block; transform-origin: bottom center;
      animation: lcSway 3s ease-in-out infinite; }
    #langChooser .lc-field span:nth-child(even) { animation-delay: .6s; }
    #langChooser .lc-tractor { position: absolute; bottom: 19%; left: -80px; font-size: 40px;
      animation: lcTractor 14s linear infinite; }

    /* Card */
    #langChooser .lc-card { position: relative; background: rgba(255,255,255,.96); border-radius: 22px;
      padding: 26px 22px; width: 100%; max-width: 360px; text-align: center;
      box-shadow: 0 14px 40px rgba(0,0,0,.25); animation: lcRise .7s ease-out both; }
    #langChooser .lc-logo { font-size: 52px; display: inline-block;
      animation: lcGrow 1s ease-out both, lcBob 3s ease-in-out 1s infinite; }
    #langChooser h2 { margin: 6px 0 4px; font-size: 20px; color: #2E7D32; }
    #langChooser p { margin: 4px 0 6px; color: #666; font-size: 14px; }

    /* Buttons */
    #langChooser button { position: relative; overflow: hidden; display: block; width: 100%;
      margin-top: 12px; padding: 15px; border: 0; border-radius: 14px; background: #2E7D32;
      color: #fff; font-size: 17px; font-weight: bold; cursor: pointer;
      box-shadow: 0 6px 14px rgba(46,125,50,.35);
      transition: transform .15s ease, box-shadow .15s ease; }
    #langChooser button:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 10px 20px rgba(46,125,50,.45); }
    #langChooser button:active { transform: scale(.97); }
    #langChooser button::after { content: ""; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
      background: linear-gradient(120deg, transparent, rgba(255,255,255,.55), transparent);
      animation: lcShine 3.5s ease-in-out 1s infinite; }
    #langChooser button[data-lang="om"] { background: #FBC02D; color: #222; box-shadow: 0 6px 14px rgba(251,192,45,.45); }

    /* Animations */
    @keyframes lcPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @keyframes lcDrift { to { left: 110%; } }
    @keyframes lcSway { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
    @keyframes lcTractor { to { left: 110%; } }
    @keyframes lcRise { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
    @keyframes lcGrow { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes lcBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes lcShine { 0% { left: -60%; } 60%,100% { left: 130%; } }

    @media (prefers-reduced-motion: reduce) {
      #langChooser *, #langChooser *::after { animation: none !important; transition: none !important; }
    }
  `;
  document.head.appendChild(style);

  // Did this visit come from another page of this same site?
  let fromThisSite = false;
  try {
    fromThisSite = !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch (e) {}
  if (fromThisSite) return;

  document.addEventListener('DOMContentLoaded', function () {
    const box = document.createElement('div');
    box.id = 'langChooser';
    box.innerHTML = `
      <div class="lc-sun"></div>
      <div class="lc-cloud" style="top: 16%; animation-delay: 0s;">☁️</div>
      <div class="lc-cloud" style="top: 28%; font-size: 30px; animation-delay: -12s;">☁️</div>
      <div class="lc-tractor">🚜</div>
      <div class="lc-field">
        <span>🌾</span><span>🌱</span><span>🌿</span><span>🌽</span>
        <span>🥬</span><span>🌾</span><span>🌱</span><span>🌽</span>
      </div>

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
        // Reload as an in-site navigation so the chooser does not show again
        if (ok) location.replace(location.href);
        else box.remove();
      });
    });
  });
})();
