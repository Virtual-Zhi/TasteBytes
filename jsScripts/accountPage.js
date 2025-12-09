let profileData = null;
let allRecipes = [];

async function loadAccount() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return; // not logged in

        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/profile", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok || data.message === "Not logged in") return;

        // profile data and load profile
        profileData = data;
        document.querySelector(".profile-banner h2").textContent = profileData.username;
        document.querySelector(".profile-banner p").textContent = `@${profileData.username}`;
        const stats = document.querySelectorAll(".stat-card .number");
        stats[0].textContent = profileData.savedRecipes.length;
        stats[1].textContent = profileData.posts.length;
        stats[2].textContent = profileData.plan;
        const info = document.querySelectorAll(".contact-card p");
        info[0].innerHTML = `Email: <strong>${profileData.email}</strong>`;
        info[1].innerHTML = `Phone: <strong>${profileData.phone}</strong>`;
    } catch (err) {
        console.error("Error loading account:", err);
    }
}

function showDashboard(dashboard, dynamic) {
    dashboard.style.display = "block";
    dynamic.style.display = "none";
    dynamic.innerHTML = "";
}

window.addEventListener("load", () => {
    const dashboard = document.getElementById("dashboardContent");
    const dynamic = document.getElementById("dynamicContent");

    document.querySelectorAll(".dashboardLink").forEach(x =>
        x.onclick = e => { e.preventDefault(); showDashboard(dashboard, dynamic); }
    );
    loadAccount();
});
