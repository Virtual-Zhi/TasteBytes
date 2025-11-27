async function loadAccount() {
    try {
        const res = await fetch("http://localhost:8080/profile", { credentials: "include" });
        const data = await res.json();

        if (data.error || data.message === "Not logged in") return;

        const user = data.user;
        console.log("Profile:", user);

        // Example: update UI with user info
        document.querySelector(".profile-banner h2").textContent = user.username;
        document.querySelector(".profile-banner p").textContent = `@${user.username}`;
        document.querySelectorAll(".stat-card .number")[0].textContent = user.savedRecipes.length;
        document.querySelectorAll(".stat-card .number")[1].textContent = user.posts.length;
        document.querySelectorAll(".stat-card .number")[2].textContent = user.plan;
        const info = document.querySelectorAll(".contact-card p");
        info[0].innerHTML = `Email: <strong>${user.email}</strong>`;
        info[1].innerHTML = `Phone: <strong>${user.phone}</strong>`;
    } catch (err) {
        console.error("Error loading account info", err);
    }
}

function showDashboard(dashboard, dynamic) {
    dashboard.style.display = "block";
    dynamic.style.display = "none";
    dynamic.innerHTML = "";
}

async function showMyRecipes(dashboard, dynamic, path) {
    dashboard.style.display = "none";
    dynamic.style.display = "block";
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error("Failed to load component");
        dynamic.innerHTML = await res.text();
        dynamic.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            dynamic.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            dynamic.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            dynamic.querySelector(`#${tab.dataset.target}`).classList.add('active');
        });
    });
    } catch (err) {
        console.error("Error loading My Recipes:", err);
        dynamic.innerHTML = "<p>Could not load My Recipes.</p>";
    }
}

window.addEventListener("load", () => {
    const dashboard = document.getElementById("dashboardContent");
    const dynamic = document.getElementById("dynamicContent");

    document.querySelectorAll(".dashboardLink").forEach(el => {
        el.onclick = e => {
            e.preventDefault();
            showDashboard(dashboard, dynamic);
        };
    });

    document.querySelectorAll(".myRecipesLink").forEach(el => {
        el.onclick = e => {
            e.preventDefault();
            showMyRecipes(dashboard, dynamic, "my_recipes.html");
        };
    });
    loadAccount();
});
