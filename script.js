// 1. Unified Language Translation Rules
function applyLanguage(lang) {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.textContent = lang === 'en' ? 'Afaan Oromoo' : 'English';
    }
    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
    document.querySelectorAll('[data-en-ph]').forEach(el => {
        el.placeholder = el.getAttribute(`data-${lang}-ph`);
    });
}

let currentLang = localStorage.getItem('selectedLang') || 'en';
applyLanguage(currentLang);

const langBtn = document.getElementById('langBtn');
if (langBtn) {
    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'om' : 'en';
        localStorage.setItem('selectedLang', currentLang);
        applyLanguage(currentLang);
        const msgBox = document.getElementById('messageBox');
        if (msgBox) msgBox.style.display = 'none';
    });
}

// 4. Registration Validation
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const msgBox = document.getElementById('messageBox');
        if (msgBox) msgBox.style.display = 'block';

        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password) === false) {
            if (msgBox) {
                msgBox.className = 'message-box error';
                msgBox.innerHTML = currentLang === 'en' ? "<strong>Weak Password!</strong>" : "<strong>Jecha Iccitii Gabaabaa!</strong>";
            }
        } else {
            const userData = {
                fullName: document.getElementById('fullName')?.value,
                password: password
            };
            fetch("https://qonna-dijitaalaa.onrender.com/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData)
            }).then(r => r.json()).then(data => console.log(data)).catch(err => console.error(err));
        }
    });
}

// 9. Session Management & 10. Login Routine
document.addEventListener('DOMContentLoaded', () => {
    // Session Guard for Marketplace
    const displayWelcomeName = document.getElementById('displayWelcomeName');
    if (displayWelcomeName) {
        const activeUserSession = JSON.parse(localStorage.getItem('activeUser'));
        if (!activeUserSession) {
            window.location.href = "login.html";
            return;
        }
        displayWelcomeName.textContent = activeUserSession.fullName;
    }

    // Logout Routine
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('activeUser');
            window.location.href = "login.html";
        });
    }

    // Login Routine
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const contact = document.getElementById('loginContact').value;
            const password = document.getElementById('loginPassword').value;
            const loginMsgBox = document.getElementById('loginMessageBox');

            fetch("https://qonna-dijitaalaa.onrender.com/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contact, password })
            })
            .then(response => {
                if (!response.ok) throw new Error("Invalid");
                return response.json();
            })
            .then(data => {
                localStorage.setItem('activeUser', JSON.stringify(data));
                window.location.href = "marketplace.html"; // Redirection added here
            })
            .catch(err => {
                if (loginMsgBox) loginMsgBox.textContent = "Login Failed";
            });
        });
    }
});
