// Live market prices. Falls back to the saved lists if the server is offline.
const PRICE_API = "https://qonna-dijitaalaa.onrender.com";

const FALLBACK_PRICES = {
    seeds: () => seedsDB,
    materials: () => materialsDB,
    chemicals: () => chemicalsDB
};

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

document.addEventListener('DOMContentLoaded', async () => {
    const box = document.getElementById('priceList');
    const search = document.getElementById('searchInput');
    const note = document.getElementById('priceNote');
    const cat = box.dataset.category;
    let rows = [];

    try {
        const res = await fetch(`${PRICE_API}/prices?category=${cat}`);
        if (!res.ok) throw new Error("server error");
        const data = await res.json();
        rows = data.prices.map(p => ({ name: p.name, type: p.kind, price: p.price, updated: p.updatedAt }));
        if (note) note.textContent = "Live prices from the market board.";
    } catch (e) {
        rows = FALLBACK_PRICES[cat]().map(p => ({ name: p.name, type: p.type, price: p.price }));
        if (note) note.textContent = "Server offline: showing saved prices.";
    }

    const render = (filter = "") => {
        const q = filter.trim().toLowerCase();
        const list = rows.filter(r => r.name.toLowerCase().includes(q));
        box.innerHTML = list.length ? "" : '<p class="empty">No items found. / Tarreen hin argamne.</p>';
        list.forEach(r => {
            const card = document.createElement('div');
            card.className = 'seed-card';
            card.innerHTML = `
                <div class="seed-info">
                    <h4>${esc(r.name)}</h4>
                    <p>${esc(r.type || "Standard quality")}</p>
                    ${r.updated ? `<p>Updated: ${esc(r.updated)}</p>` : ""}
                </div>
                <div class="price-tag">${Number(r.price).toLocaleString()} ETB</div>
                <a class="action-btn" href="post-product.html">Buy/Sell</a>
            `;
            box.appendChild(card);
        });
    };

    search.addEventListener('input', e => render(e.target.value));
    render();
});
