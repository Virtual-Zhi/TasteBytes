let profileData = null;
let allRecipes = [];

async function loadAccount() {
    try {
        const res = await fetch("http://localhost:8080/profile", { credentials: "include" });
        const data = await res.json();
        if (data.error || data.message === "Not logged in") return;

        profileData = data.user;
        document.querySelector(".profile-banner h2").textContent = profileData.username;
        document.querySelector(".profile-banner p").textContent = `@${profileData.username}`;
        const stats = document.querySelectorAll(".stat-card .number");
        stats[0].textContent = profileData.savedRecipes.length;
        stats[1].textContent = profileData.posts.length;
        stats[2].textContent = profileData.plan;
        const info = document.querySelectorAll(".contact-card p");
        info[0].innerHTML = `Email: <strong>${profileData.email}</strong>`;
        info[1].innerHTML = `Phone: <strong>${profileData.phone}</strong>`;
        await loadAllRecipes();
    } catch { }
}

async function loadAllRecipes() {
    try {
        const res = await fetch("http://localhost:8080/recipes", { credentials: "include" });
        const data = await res.json();
        if (res.ok) allRecipes = data.recipes;
    } catch { }
}

function showDashboard(dashboard, dynamic) {
    dashboard.style.display = "block";
    dynamic.style.display = "none";
    dynamic.innerHTML = "";
}

function setImageStatus(text, cls = "") {
    const el = document.getElementById('imageStatus');
    if (el) {
        el.textContent = text;
        el.className = 'image-status ' + cls;
    }
}

function initSubmitRecipe() {
    const form = document.getElementById('recipeForm');
    if (!form || form.dataset.submitListenerAttached) return;
    form.dataset.submitListenerAttached = "true";

    const fileInput = document.getElementById('recipeImage');
    if (fileInput && !fileInput.dataset.listenerAttached) {
        fileInput.addEventListener('change', () => {
            const f = fileInput.files?.[0];
            setImageStatus(f ? `Selected: ${f.name}` : 'No image selected', f ? 'has-image' : 'no-image');
        });
        fileInput.dataset.listenerAttached = 'true';
    }

    form.onsubmit = async e => {
        e.preventDefault();
        const title = document.getElementById('recipeName')?.value.trim();
        const type = document.getElementById('recipeType')?.value || "";
        const prepTimeRaw = document.getElementById('prepTime')?.value || "";
        const ingredients = (document.getElementById('ingredients')?.value || "")
            .split('\n').map(i => i.trim()).filter(Boolean);
        const instructions = document.getElementById('instructions')?.value.trim();
        const tips = document.getElementById('tips')?.value.trim();
        const prepTime = prepTimeRaw ? Number(prepTimeRaw) : null;

        if (!title || !ingredients.length || !instructions || prepTime === null || isNaN(prepTime) || prepTime < 0) {
            alert("Please fill all required fields correctly."); return;
        }

        const file = fileInput?.files?.[0];
        if (!file) { alert("A photo is required."); return; }
        if (file.size > 5 * 1024 * 1024) { alert("Image too large."); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert("Unsupported image type."); return; }

        const fd = new FormData(form);
        fd.set('ingredients', JSON.stringify(ingredients));
        fd.set('title', title);
        fd.set('image', file);

        try {
            setImageStatus('Uploading image...', 'uploading');
            const res = await fetch('http://localhost:8080/post_recipe', { method: 'POST', body: fd, credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setImageStatus('Image uploaded', 'uploaded');
                alert('Recipe posted successfully!');
                form.reset();
                setTimeout(() => setImageStatus('No image selected', 'no-image'), 1500);
                if (data.recipe) {
                    allRecipes.push(data.recipe);
                    profileData?.posts?.push(data.recipe._id);
                }
                renderMyPosts();
            } else {
                alert(data?.error || data?.message || 'Server error');
                setImageStatus('Upload failed', 'error');
            }
        } catch {
            alert('Network error');
            setImageStatus('Network error', 'error');
        }
    };
}

function viewRecipe(recipeId) {
    window.location.href = `../pages/view-recipe.html?id=${recipeId}`;
}

function renderMyPosts() {
    const postsContainer = document.getElementById("myPostsList");
    if (!profileData || !allRecipes.length) {
        postsContainer.innerHTML = "<p>No posts yet.</p>"; return;
    }
    const posts = allRecipes.filter(r => profileData.posts.includes(r._id));
    postsContainer.innerHTML = posts.length ? posts.map(r => `
    <div class="recipe-card">
      <h2>${escapeHtml(r.title)}</h2>
      <span>${escapeHtml(r.type || '')}</span>
      <div><span>${escapeHtml(String(r.prepTime || 0))} min</span>
      <span>★${escapeHtml(String(r.rating?.average || 0))}/5 (${escapeHtml(String(r.rating?.count || 0))})</span></div>
      <div><strong>Ingredients:</strong> ${(r.ingredients || []).slice(0, 3).map(escapeHtml).join(', ')}${(r.ingredients || []).length > 3 ? '…' : ''}</div>
      <p>Made by: ${escapeHtml(profileData.username)}</p>
      <button onclick="viewRecipe('${r._id}')">View Recipe</button>
    </div>`).join("") : "<p>No posts yet.</p>";
}

function renderSavedRecipes() {
    const savedContainer = document.getElementById("savedRecipesList");
    if (!profileData || !allRecipes.length) {
        savedContainer.innerHTML = "<p>No saved recipes yet.</p>"; return;
    }
    const saved = allRecipes.filter(r => profileData.savedRecipes.includes(r._id));
    savedContainer.innerHTML = saved.length ? saved.map(r => `
    <div class="recipe-card">
      <h2>${escapeHtml(r.title)}</h2>
      <span>${escapeHtml(r.type || '')}</span>
      <div><span>⏱${escapeHtml(String(r.prepTime || 0))} min</span>
      <span>★${escapeHtml(String(r.rating?.average || 0))}/5 (${escapeHtml(String(r.rating?.count || 0))})</span></div>
      <div><strong>Ingredients:</strong> ${(r.ingredients || []).slice(0, 3).map(escapeHtml).join(', ')}${(r.ingredients || []).length > 3 ? '…' : ''}</div>
      <p>Made by: ${escapeHtml(r.ownerName || r.ownerId)}</p>
      <button onclick="viewRecipe('${r._id}')">View Recipe</button>
    </div>`).join("") : "<p>No saved recipes yet.</p>";
}

async function showMyRecipes(dashboard, dynamic, path) {
    dashboard.style.display = "none";
    dynamic.style.display = "block";
    try {
        const res = await fetch(path);
        dynamic.innerHTML = await res.text();
        dynamic.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                dynamic.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                dynamic.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                dynamic.querySelector(`#${tab.dataset.target}`).classList.add('active');
            };
        });
        initSubmitRecipe();
        renderMyPosts();
        renderSavedRecipes();
    } catch {
        dynamic.innerHTML = "<p>Could not load My Recipes.</p>";
    }
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.addEventListener("load", () => {
    const dashboard = document.getElementById("dashboardContent");
    const dynamic = document.getElementById("dynamicContent");
    document.querySelectorAll(".dashboardLink").forEach(x => x.onclick = e => { e.preventDefault(); showDashboard(dashboard, dynamic); });
    document.querySelectorAll(".myRecipesLink").forEach(x => x.onclick = e => { e.preventDefault(); showMyRecipes(dashboard, dynamic, "my_recipes.html"); });
    loadAccount();
});
