const loginForm = document.getElementById("loginForm");
const createForm = document.getElementById("createForm");
const formTitle = document.getElementById("formTitle");

document.getElementById("showCreate").addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.remove("active");
    createForm.classList.add("active");
    formTitle.textContent = "Create Account";
});

document.getElementById("showLogin").addEventListener("click", (e) => {
    e.preventDefault();
    createForm.classList.remove("active");
    loginForm.classList.add("active");
    formTitle.textContent = "Login";
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {

            localStorage.setItem("token", data.token);
            alert("Welcome " + data.username + "!");
            window.location.href = document.referrer;
        } else {
            alert("Login failed: " + data.message);
        }
    } catch (err) {
        alert("Error connecting to server: " + err.message);
    }
});


document.getElementById("createForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById("newUsername").value;
    const newEmail = document.getElementById("newEmail").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match. Please try again.");
        return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        alert("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
        return;
    }

    try {
        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/create_account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newUsername, newEmail, newPassword })
        });
        const data = await res.json();

        if (res.ok) {
            alert("Account created! Please log in.");
            createForm.classList.remove("active");
            loginForm.classList.add("active");
            formTitle.textContent = "Login";
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error connecting to server");
    }
});

const client = google.accounts.oauth2.initCodeClient({
    client_id: "261255118602-r5igalkpb2q6oe2jo5lp1td3uas6v11r.apps.googleusercontent.com",
    scope: "email profile",
    ux_mode: "popup",
    callback: async (response) => {
        try {
            const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/google_login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: response.code })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("token", data.token);
                alert("Welcome " + data.username + "!");
                window.location.href = document.referrer;
            } else {
                alert("Google login failed: " + data.message);
            }
        } catch (err) {
            alert("Network error during Google login: " + err.message);
        }
    }

});

document.querySelectorAll(".google-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        client.requestCode();
    });
});
