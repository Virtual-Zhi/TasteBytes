let profileData = null;
let allRecipes = [];

async function loadAccount() {
    try {
        const res = await fetch("http://localhost:8080/profile", { credentials: "include" });
        const data = await res.json();

        if (data.error || data.message === "Not logged in") return;

        profileData = data.user;
        console.log("Profile:", profileData);

        // Update UI with user info
        document.querySelector(".profile-banner h2").textContent = profileData.username;
        document.querySelector(".profile-banner p").textContent = `@${profileData.username}`;
        document.querySelectorAll(".stat-card .number")[0].textContent = profileData.savedRecipes.length;
        document.querySelectorAll(".stat-card .number")[1].textContent = profileData.posts.length;
        document.querySelectorAll(".stat-card .number")[2].textContent = profileData.plan;
        const info = document.querySelectorAll(".contact-card p");
        info[0].innerHTML = `Email: <strong>${profileData.email}</strong>`;
        info[1].innerHTML = `Phone: <strong>${profileData.phone}</strong>`;
        await loadAllRecipes();
    } catch (err) {
        console.error("Error loading account info", err);
    }
}

async function loadAllRecipes() {
    try {
        const res = await fetch("http://localhost:8080/recipes", { credentials: "include" });
        const data = await res.json();
        if (res.ok) {
            allRecipes = data.recipes;
        }
    } catch (err) {
        console.error("Error loading recipes", err);
    }
}

function showDashboard(dashboard, dynamic) {
    dashboard.style.display = "block";
    dynamic.style.display = "none";
    dynamic.innerHTML = "";
}

async function submitRecipe() {
    const form = document.getElementById('recipeForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recipe = {
            title: document.getElementById('recipeName').value.trim(),
            type: document.getElementById('recipeType').value,
            prepTime: document.getElementById('prepTime').value,
            ingredients: document.getElementById('ingredients').value
                .split('\n')
                .map(i => i.trim())
                .filter(i => i),
            instructions: document.getElementById('instructions').value.trim(),
            tips: document.getElementById('tips').value.trim(),
        };

        try {
            const res = await fetch('http://localhost:8080/post_recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipe),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.status == 403) {
                alert(data.message);
                return;
            }

            if (res.ok) {
                alert('Recipe posted successfully!');
                form.reset();
            } else {
                alert(data.message || 'Error uploading recipe');
            }
        } catch (err) {
            alert('Network error while uploading recipe');
        }
    });
}

function renderMyPosts() {
    const postsContainer = document.getElementById("myPostsList");
    if (!profileData || !allRecipes.length) {
        postsContainer.innerHTML = "<p>No posts yet.</p>";
        return;
    }
    const posts = allRecipes.filter(r => profileData.posts.includes(r._id));
    postsContainer.innerHTML = posts.length
        ? posts.map(recipe => `
            <div class="recipe-card">
                <div class="recipe-content">
                    <h2 class="recipe-title">${recipe.title}</h2>
                    <span class="recipe-type">${recipe.type || ''}</span>
                    <div class="recipe-meta">
                        <span>⏱️ ${recipe.prepTime || 0} min</span>
                        <span>⭐ ${recipe.rating?.average || 0}/5 (${recipe.rating?.count || 0} ratings)</span>
                    </div>
                    <div class="recipe-ingredients">
                        <strong>Ingredients:</strong> ${(recipe.ingredients || []).slice(0, 3).join(', ')}${(recipe.ingredients || []).length > 3 ? '…' : ''}
                    </div>
                    <div class="recipe-owner">
                        <p>Made by: ${recipe.ownerName || recipe.ownerId}</p>
                    </div>
                    <div class="recipe-actions">
                        <button class="view-recipe-btn" onclick="viewRecipe('${recipe._id}')">👀 View Recipe</button>
                    </div>
                </div>
            </div>
        `).join("")
        : "<p>No posts yet.</p>";

}

function renderSavedRecipes() {
    const savedContainer = document.getElementById("savedRecipesList");
    if (!profileData || !allRecipes.length) {
        savedContainer.innerHTML = "<p>No saved recipes yet.</p>";
        return;
    }
    const saved = allRecipes.filter(r => profileData.savedRecipes.includes(r._id));
    savedContainer.innerHTML = saved.length
        ? saved.map(recipe => `
            <div class="recipe-card">
                <div class="recipe-content">
                    <h2 class="recipe-title">${recipe.title}</h2>
                    <span class="recipe-type">${recipe.type || ''}</span>
                    <div class="recipe-meta">
                        <span>⏱️ ${recipe.prepTime || 0} min</span>
                        <span>⭐ ${recipe.rating?.average || 0}/5 (${recipe.rating?.count || 0} ratings)</span>
                    </div>
                    <div class="recipe-ingredients">
                        <strong>Ingredients:</strong> ${(recipe.ingredients || []).slice(0, 3).join(', ')}${(recipe.ingredients || []).length > 3 ? '…' : ''}
                    </div>
                    <div class="recipe-owner">
                        <p>Made by: ${recipe.ownerName || recipe.ownerId}</p>
                    </div>
                    <div class="recipe-actions">
                        <button class="view-recipe-btn" onclick="viewRecipe('${recipe._id}')">👀 View Recipe</button>
                    </div>
                </div>
            </div>
        `).join("")
        : "<p>No saved recipes yet.</p>";
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

        renderMyPosts();
        renderSavedRecipes();

        submitRecipe();
    } catch (err) {
        console.error("Error loading My Recipes:", err);
        dynamic.innerHTML = "<p>Could not load My Recipes.</p>";
    }
}

window.addEventListener("load", () => {
    const dashboard = document.getElementById("dashboardContent");
    const dynamic = document.getElementById("dynamicContent");

    document.querySelectorAll(".dashboardLink").forEach(x => {
        x.onclick = e => {
            e.preventDefault();
            showDashboard(dashboard, dynamic);
        };
    });

    document.querySelectorAll(".myRecipesLink").forEach(x => {
        x.onclick = e => {
            e.preventDefault();
            showMyRecipes(dashboard, dynamic, "my_recipes.html");
        };
    });

    loadAccount();
});
