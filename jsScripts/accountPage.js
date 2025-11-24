console.log("LOADED JS");

async function loadAccount() {
    console.log("loadAccount triggered");
    try {
        const res = await fetch("http://localhost:8080/profile", {
            credentials: "include"
        });
        const data = await res.json();

        // In case user somehow gets this page without logging in
        if (data.error || data.message === "Not logged in") {
            document.querySelector(".account-title").textContent = "Please sign in first";
            return;
        }

        const user = data.user;
        const profileCard = document.querySelector(".profile-card");
        profileCard.querySelector("h2").innerHTML = `${user.username} <span>@${user.username}</span>`;

        const stats = profileCard.querySelectorAll(".stat");
        stats[0].querySelector("strong").textContent = user.followers;
        stats[0].querySelector("span").textContent = "Followers";

        stats[1].querySelector("strong").textContent = user.following;
        stats[1].querySelector("span").textContent = "Following";

        document.querySelectorAll(".recipe-card h4")[0].textContent = `${user.savedRecipes.length} Saved Recipes`;
        document.querySelectorAll(".recipe-card h4")[1].textContent = `${user.posts.length} Recipes You Posted`;

        const planCards = document.querySelectorAll(".featured-recipes .recipe-card h4");
        planCards[2].textContent = user.plan;

        document.querySelector(".spotlight-section p:nth-of-type(1)").textContent = `Your email: ${user.email}`;
        document.querySelector(".spotlight-section p:nth-of-type(2)").textContent = `Your phone number: ${user.phone}`;
    } catch (err) {
        console.error("Error loading account info", err);
    }
}

window.addEventListener("load", loadAccount);