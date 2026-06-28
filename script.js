// 1. Unified Language Translation Rules
function applyLanguage(lang) {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.textContent = lang === 'en' ? 'Afaan Oromoo' : 'English';
    }

    // Change text content for tagged elements
    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });

    // Change input input placeholder values safely 
    document.querySelectorAll('[data-en-ph]').forEach(el => {
        el.placeholder = el.getAttribute(`data-${lang}-ph`);
    });
}

// 2. Global Site Persistent State Initialization (Reads saved language choices)
let currentLang = localStorage.getItem('selectedLang') || 'en';
applyLanguage(currentLang);

// 3. Language Toggle Click Event
const langBtn = document.getElementById('langBtn');
if (langBtn) {
    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'om' : 'en';
        
        // Save the chosen language to localStorage for the whole website
        localStorage.setItem('selectedLang', currentLang); 
        applyLanguage(currentLang);

        // Hide warning popups during language transitions
        const msgBox = document.getElementById('messageBox');
        if (msgBox) msgBox.style.display = 'none';
    });
}

// 4. Multi-Factor Registration Validation Filter
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Halt default form refreshing routines
        
        const password = document.getElementById('password').value;
        const msgBox = document.getElementById('messageBox');

        // Robust Password Check Conditionals
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        const isLongEnough = password.length >= 8;

        msgBox.style.display = 'block';

        if (!hasLetter || !hasNumber || !hasSpecial || !isLongEnough) {
            // Error State: Show security requirements message dynamically
            msgBox.className = 'message-box error';
            if (currentLang === 'en') {
                msgBox.innerHTML = `<strong>Weak Password!</strong><br>Your password must contain a mixture of characters, numbers, and alphabets (at least 8 characters long).<br><em>Example: Secure#2026</em>`;
            } else {
                msgBox.innerHTML = `<strong>Jecha Iccitii Gabaabaa!</strong><br>Jechi iccitii keessan qubee, lakkoofsa fi mallattoo addaa walitti makuu qaba (yoo xiqqaate mallattolee 8).<br><em>Fakkeenya: Secure#2026</em>`;
            }
        } else {
            // Success State: Clear form validation and trigger pending verification processing banner
            msgBox.className = 'message-box info';
            if (currentLang === 'en') {
                msgBox.innerHTML = `<strong>Account Provisionally Saved!</strong><br>Because your Sheger City ID card is digital, your account activation is pending security verification. We are validating your card metrics now.`;
            } else {
                msgBox.innerHTML = `<strong>Herregni Keessan Olkaayameera!</strong><br>Waraqaan eenyummaa Shaggar keessan dijitaala waan ta'eef, herregni keessan guutummaatti banamuuf sirreessuun mirkanaa'aa jira.`;
            }
        }
    });
}
// 5. Product Form Interception Routing
const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('productName').value;
        const price = document.getElementById('productPrice').value;
        const msgBox = document.getElementById('messageBox');

        msgBox.style.display = 'block';
        msgBox.className = 'message-box info';

        if (currentLang === 'en') {
            msgBox.innerHTML = `<strong>Success!</strong> Listed "${name}" for ${price} ETB successfully.`;
        } else {
            msgBox.innerHTML = `<strong>Milkaa'ina!</strong> "${name}" gatii ${price} ETB tiin gabaafameera.`;
        }

        productForm.reset();
    });
}

// 6. Marketplace Role-Based Filter Engine
const roleSimulator = document.getElementById('roleSimulator');
const marketAction = document.getElementById('marketAction');
const buyOption = document.getElementById('buyOption');

function enforceRoleRestrictions() {
    if (!roleSimulator || !marketAction) return;
    
    if (roleSimulator.value === 'supplier') {
        // Suppliers can ONLY sell. Force selection to 'sell' and hide 'buy'
        marketAction.value = 'sell';
        if (buyOption) buyOption.style.display = 'none';
    } else {
        // Farmers can access both buy and sell options
        if (buyOption) buyOption.style.display = 'block';
    }
}

// Run immediately on page load and whenever the simulated role drops down changes
if (roleSimulator) {
    roleSimulator.addEventListener('change', enforceRoleRestrictions);
    enforceRoleRestrictions(); 
}

// Updated Marketplace Form Submission Handler
const marketForm = document.getElementById('productForm');
if (marketForm) {
    marketForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const action = marketAction.value;
        const name = document.getElementById('productName').value;
        const price = document.getElementById('productPrice').value;
        const msgBox = document.getElementById('messageBox');

        msgBox.style.display = 'block';
        msgBox.className = 'message-box info';

        if (currentLang === 'en') {
            const actionText = action === 'sell' ? 'Listed for Sale' : 'Requested to Buy';
            msgBox.innerHTML = `<strong>Success!</strong> "${name}" has been ${actionText} at ${price} ETB.`;
        } else {
            const actionText = action === 'sell' ? 'Gurgurtaaf dhiyaateera' : 'Bituuf gaafatameera';
            msgBox.innerHTML = `<strong>Milkaa'ina!</strong> "${name}" gatii ${price} ETB tiin ${actionText}.`;
        }

        marketForm.reset();
        enforceRoleRestrictions(); // Keep role states intact after clearing form input values
    });
}
