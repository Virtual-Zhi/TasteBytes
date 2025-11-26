console.log("Dashboard JS Loaded");

async function loadAccount() {
    console.log("loadAccount triggered");

    try {
        const res = await fetch("http://localhost:8080/profile", {
            credentials: "include"
        });

        const data = await res.json();
        console.log("Profile data:", data);

        // Check login status
        if (data.error || data.message === "Not logged in") {
            document.querySelector(".profile-banner h2").textContent = "Please sign in first";
            document.querySelector(".profile-banner p").textContent = "";
            return;
        }

        const user = data.user;

        const banner = document.querySelector(".profile-banner");
        banner.querySelector("h2").textContent = user.username;
        banner.querySelector("p").textContent = `@${user.username}`;

        const statCards = document.querySelectorAll(".stat-card");


        statCards[0].querySelector(".number").textContent = user.savedRecipes.length;

        statCards[1].querySelector(".number").textContent = user.posts.length;

        statCards[2].querySelector(".number").textContent = user.plan;


        const contact = document.querySelector(".contact-card");
        const info = contact.querySelectorAll("p");

        info[0].innerHTML = `Email: <strong>${user.email}</strong>`;
        info[1].innerHTML = `Phone: <strong>${user.phone}</strong>`;

    } catch (err) {
        console.error("Error loading account info", err);
    }
}

window.addEventListener("load", loadAccount);
