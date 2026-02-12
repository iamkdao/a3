function getAccounts() {
    try {
        return JSON.parse(localStorage.getItem("accounts")) || {};
    } catch {
        return {};
    }
}

function setAccounts(obj) {
    localStorage.setItem("accounts", JSON.stringify(obj));
}

function setCurrentUser(username) {
    localStorage.setItem("currentUser", username);
}

function switchSites() {
    const loginForm = document.querySelector("#login-form");
    const signupForm = document.querySelector("#signup-form");

    if (loginForm) {
        window.location.href = "/signup"
    }
    if (signupForm) {
        window.location.href = "/login"
    }
}

window.onload = () => {
    const loginForm = document.querySelector("#login-form");
    const signupForm = document.querySelector("#signup-form");
    const msg = document.querySelector("#auth-msg");

    const show = (text) => { if (msg) msg.textContent = text || ""; };

    // LOGIN
    if (loginForm) {
        document.querySelector("#login-btn").onclick = async (e) => {
            e.preventDefault();
            show("");

            const username = document.querySelector("#login-username").value.trim();
            const password = document.querySelector("#login-password").value;

            const accounts = getAccounts();

            if (!accounts[username] || accounts[username] !== password) {
                show("Invalid username or password");
                return;
            }

            setCurrentUser(username);

            await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ username }),
            });
            window.location.href = "/index";
        };
    }

    // SIGNUP
    if (signupForm) {
        signupForm.onsubmit = async (e) => {
            e.preventDefault();
            show("");

            const username = document.querySelector("#signup-username").value.trim();
            const password = document.querySelector("#signup-password").value;

            if (!username || !password) {
                show("Enter username and password");
                return;
            }

            const accounts = getAccounts();

            if (accounts[username]) {
                show("Username already exists on this browser");
                return;
            }

            accounts[username] = password;
            setAccounts(accounts);

            setCurrentUser(username);

            await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ username }),
            })
            window.location.href = "/index";
        };
    }
};
