// ===========================================================================
// Qonna Dijitaalaa - shared script
// ===========================================================================
const API_URL = "https://qonna-dijitaalaa.onrender.com";

// ---------- 1. Language ----------
function applyLanguage(lang) {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.textContent = lang === 'en' ? 'Afaan Oromoo' : 'English';
    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
    document.querySelectorAll('[data-en-ph]').forEach(el => {
        el.placeholder = el.getAttribute(`data-${lang}-ph`);
    });
}

let currentLang = localStorage.getItem('selectedLang') || 'en';
const t = (en, om) => (currentLang === 'en' ? en : om);

// ---------- 2. Helpers ----------
function getUser() {
    try { return JSON.parse(localStorage.getItem('activeUser')); } catch (e) { return null; }
}

async function api(path, options = {}) {
    const user = getUser();
    const headers = { "Content-Type": "application/json" };
    if (user && user.token) headers["Authorization"] = "Bearer " + user.token;
    const res = await fetch(API_URL + path, { ...options, headers });
    let data = {};
    try { data = await res.json(); } catch (e) { /* ignore */ }
    if (res.status === 401 && user && path !== "/login") {
        localStorage.removeItem('activeUser');
        window.location.href = "login.html";
    }
    if (!res.ok) throw new Error(data.message || "Error");
    return data;
}

function showMsg(box, text, ok) {
    if (!box) return;
    box.style.display = 'block';
    box.className = 'message-box ' + (ok ? 'success' : 'error');
    box.textContent = text;
}

function requireLogin() {
    if (!getUser()) { window.location.href = "login.html"; return false; }
    return true;
}

const CATEGORY_LABELS = {
    seeds: ["Seeds", "Sanyii"],
    materials: ["Farm Materials & Tools", "Meeshaalee Qonnaa"],
    fertilizer: ["Fertilizers", "Xaa'oo"],
    produce: ["Fresh Harvest", "Midhaan Oomishame"]
};
const catLabel = c => t(...(CATEGORY_LABELS[c] || [c, c]));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g,
    ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// ---------- 3. Language button ----------
applyLanguage(currentLang);
const langBtn = document.getElementById('langBtn');
if (langBtn) {
    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'om' : 'en';
        localStorage.setItem('selectedLang', currentLang);
        applyLanguage(currentLang);
        const msgBox = document.getElementById('messageBox');
        if (msgBox) msgBox.style.display = 'none';
        if (typeof window.onLangChange === 'function') window.onLangChange();
    });
}

// ---------- 4. Registration ----------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const val = id => (document.getElementById(id)?.value || "").trim();
        const password = document.getElementById('password').value;
        const msgBox = document.getElementById('messageBox');
        const btn = document.getElementById('submitBtn');

        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
            showMsg(msgBox, t("Weak password! Use 8+ characters with letters, numbers and a symbol.",
                "Jecha iccitii laafaa! Qubee, lakkoofsa fi mallattoo waliin 8 ol fayyadami."), false);
            return;
        }
        const idFile = document.getElementById('idUpload')?.files[0];
        const userData = {
            fullName: val('fullName'), username: val('username'), contact: val('contact'),
            subCity: val('subcity'), shegerId: val('shegerId'),
            idCardName: idFile ? idFile.name : "", role: val('role') || "farmer", password
        };
        btn.disabled = true;
        try {
            const data = await api("/register", { method: "POST", body: JSON.stringify(userData) });
            showMsg(msgBox, data.message, true);
            setTimeout(() => window.location.href = "login.html", 1200);
        } catch (err) {
            showMsg(msgBox, err.message === "Failed to fetch"
                ? t("Cannot reach server. Try again in a minute.", "Sarvarii quunnamuu hin dandeenye. Booda yaali.")
                : err.message, false);
        } finally { btn.disabled = false; }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // ---------- 5. Login ----------
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const box = document.getElementById('loginMessageBox');
            try {
                const data = await api("/login", {
                    method: "POST",
                    body: JSON.stringify({
                        contact: document.getElementById('loginContact').value.trim(),
                        password: document.getElementById('loginPassword').value
                    })
                });
                localStorage.setItem('activeUser', JSON.stringify(data));
                window.location.href = "marketplace.html";
            } catch (err) {
                showMsg(box, err.message === "Failed to fetch"
                    ? t("Cannot reach server. Try again in a minute.", "Sarvarii quunnamuu hin dandeenye. Booda yaali.")
                    : err.message, false);
            }
        });
    }

    // ---------- 6. Profile page (marketplace.html) ----------
    if (document.getElementById('displayWelcomeName')) {
        if (!requireLogin()) return;
        const u = getUser();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || "-"; };
        set('displayWelcomeName', u.fullName);
        set('profFullName', u.fullName); set('profUsername', u.username);
        set('profContact', u.contact); set('profSubCity', u.subCity);
        set('profShegerId', u.shegerId);
        set('profRole', u.role === 'supplier' ? t("Supplier", "Dhiyeessaa") : t("Farmer", "Qote Bulaa"));
        const hub = document.getElementById('additionalActionButton');
        if (hub) hub.addEventListener('click', () => window.location.href = "index.html");
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('activeUser');
            window.location.href = "login.html";
        });
    }

    // ---------- 7. Post product page ----------
    const productForm = document.getElementById('productForm');
    if (productForm) {
        if (!requireLogin()) return;
        const u = getUser();
        // Suppliers can only sell
        if (u.role === 'supplier') {
            const buyOpt = document.getElementById('buyOption');
            if (buyOpt) buyOpt.remove();
        }
        productForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const box = document.getElementById('messageBox');
            const btn = document.getElementById('submitBtn');
            const g = id => document.getElementById(id).value;
            btn.disabled = true;
            try {
                const data = await api("/listings", {
                    method: "POST",
                    body: JSON.stringify({
                        action: g('marketAction'), category: g('itemCategory'),
                        name: g('productName'), price: g('productPrice'),
                        quantity: g('productQuantity'), unit: g('productUnit'),
                        description: g('productDescription')
                    })
                });
                showMsg(box, data.message, true);
                productForm.reset();
                setTimeout(() => window.location.href = "listings.html", 1000);
            } catch (err) { showMsg(box, err.message, false); }
            finally { btn.disabled = false; }
        });
    }

    // ---------- 8. Listings page ----------
    const listingsBox = document.getElementById('listingsBox');
    if (listingsBox) {
        if (!requireLogin()) return;
        let lastData = [];

        const render = () => {
            if (!lastData.length) {
                listingsBox.innerHTML = `<p class="empty">${t("No listings found.", "Tarreen hin argamne.")}</p>`;
                return;
            }
            listingsBox.innerHTML = lastData.map(l => {
                const qty = l.quantity ? `${l.quantity} ${esc(l.unit || "")}` : "";
                const tag = l.action === 'sell' ? t("SELL", "GURGURTAA") : t("BUY", "BITAA");
                const tel = esc(l.owner.contact);
                return `<div class="listing-card">
                    <div class="listing-top"><span class="tag ${l.action}">${tag}</span>
                    <span class="cat">${esc(catLabel(l.category))}</span></div>
                    <h3>${esc(l.name)}</h3>
                                                            <p class="meta"><a href="listing.html?id=${l.id}">${t("View details", "Bal'ina ilaali")} →</a></p>
                    <p class="price">${esc(l.price)} ETB ${qty ? "· " + qty : ""}</p>
                    ${l.description ? `<p class="desc">${esc(l.description)}</p>` : ""}
                    <p class="meta">👤 ${esc(l.owner.fullName)} · 📍 ${esc(l.owner.subCity)} · ${esc(l.createdAt)}</p>
                    <p class="meta">📞 <a href="${/^[+\d\s-]+$/.test(l.owner.contact) ? 'tel:' + tel : 'mailto:' + tel}">${tel}</a></p>
                    ${l.mine ? `<button class="del-btn" data-id="${l.id}">${t("Delete", "Haqi")}</button>` : ""}
                </div>`;
            }).join("");
        };

        const load = async () => {
            const p = new URLSearchParams();
            [['fAction', 'action'], ['fCategory', 'category'], ['fSubCity', 'subCity'], ['fSearch', 'q']].forEach(([id, key]) => {
                const v = document.getElementById(id).value.trim();
                if (v) p.set(key, v);
            });
            if (document.getElementById('fMine').checked) p.set('mine', '1');
            try {
                const data = await api("/listings?" + p.toString());
                lastData = data.listings;
                render();
            } catch (err) {
                listingsBox.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
            }
        };

        ['fAction', 'fCategory', 'fSubCity', 'fMine'].forEach(id =>
            document.getElementById(id).addEventListener('change', load));
        let timer;
        document.getElementById('fSearch').addEventListener('input', () => {
            clearTimeout(timer); timer = setTimeout(load, 350);
        });
        listingsBox.addEventListener('click', async e => {
            const btn = e.target.closest('.del-btn');
            if (!btn || !confirm(t("Delete this listing?", "Tarree kana haquu?"))) return;
            try { await api("/listings/" + btn.dataset.id, { method: "DELETE" }); load(); }
            catch (err) { alert(err.message); }
        });
        window.onLangChange = render;
        load();
    }
});
