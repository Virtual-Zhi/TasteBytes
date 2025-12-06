let profileData = null;
let allRecipes = [];

async function loadAccount() {
    try {
        const res = await fetch("http://localhost:8080/profile", { credentials: "include" });
        const data = await res.json();

        if (data.error || data.message === "Not logged in") return;

        profileData = data.user;
        console.log("Profile:", profileData);

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

function setImageStatus(text, cls = "") {
    const el = document.getElementById('imageStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'image-status ' + cls;
}


function initSubmitRecipe() {
    const form = document.getElementById('recipeForm');
    if (!form) return;

    // Attach file-change listener once
    const fileInput = document.getElementById('recipeImage');
    if (fileInput && !fileInput.dataset.listenerAttached) {
        fileInput.addEventListener('change', () => {
            const f = fileInput.files?.[0] || null;
            if (!f) {
                setImageStatus('No image selected', 'no-image');
            } else {
                setImageStatus(`Selected: ${f.name}`, 'has-image');
            }
        });
        fileInput.dataset.listenerAttached = 'true';
    }

    // Attach submit listener once
    if (form.dataset.submitListenerAttached) return;
    form.dataset.submitListenerAttached = "true";

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Read and validate fields client-side
        const titleRaw = document.getElementById('recipeName')?.value || "";
        const type = document.getElementById('recipeType')?.value || "";
        const prepTimeRaw = document.getElementById('prepTime')?.value || "";
        const ingredientsRaw = document.getElementById('ingredients')?.value || "";
        const instructionsRaw = document.getElementById('instructions')?.value || "";
        const tipsRaw = document.getElementById('tips')?.value || "";

        const title = titleRaw.trim();
        const ingredients = ingredientsRaw.split('\n').map(i => i.trim()).filter(Boolean);
        const instructions = instructionsRaw.trim();
        const prepTime = prepTimeRaw.trim() === "" ? null : Number(prepTimeRaw);
        const tips = tipsRaw.trim();

        // Required checks
        if (!title) { alert("Title is required."); return; }
        if (!ingredients.length) { alert("At least one ingredient is required."); return; }
        if (!instructions) { alert("Instructions are required."); return; }
        if (prepTime === null || Number.isNaN(prepTime) || prepTime < 0) {
            alert("Prep time is required and must be a non-negative number."); return;
        }

        // File validation
        const file = document.getElementById('recipeImage')?.files?.[0] || null;
        if (!file) {
            setImageStatus('No image selected', 'no-image');
            alert("A photo is required to post the recipe.");
            return;
        }
        const maxBytes = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxBytes) {
            setImageStatus('Image too large', 'error');
            alert("Image is too large. Please use an image smaller than 5 MB.");
            return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setImageStatus('Unsupported image type', 'error');
            alert("Unsupported image type. Use JPG, PNG, or WEBP.");
            return;
        }

        // Build FormData from the form to avoid duplicate keys
        const fd = new FormData(form);
        // Ensure single-string ingredients field (server expects JSON string)
        fd.set('ingredients', JSON.stringify(ingredients));
        // Ensure trimmed title
        fd.set('title', title);
        // Always append the file explicitly so it's guaranteed to be sent
        fd.set('image', file);

        try {
            setImageStatus('Uploading image...', 'uploading');

            const res = await fetch('http://localhost:8080/post_recipe', {
                method: 'POST',
                body: fd,
                credentials: 'include'
            });

            // parse and log response for debugging
            const data = await res.json();
            console.log('POST /post_recipe response', res.status, data);

            if (res.ok) {
                // check common locations for returned image URL
                const imageUrl = data?.recipe?.imageUrl || data?.imageUrl || null;
                const uploaded = Boolean(imageUrl);

                setImageStatus(uploaded ? 'Image uploaded' : 'Image not uploaded', uploaded ? 'uploaded' : 'no-image');
                alert('Recipe posted successfully!');
                form.reset();
                setTimeout(() => setImageStatus('No image selected', 'no-image'), 1500);

                if (data.recipe) {
                    allRecipes.push(data.recipe);
                    if (profileData && Array.isArray(profileData.posts)) {
                        profileData.posts.push(data.recipe._id);
                    }
                }
                renderMyPosts();
            } else {
                // server returned an error status
                const errMsg = data?.error || data?.message || 'Server error while posting recipe';
                setImageStatus('Upload failed', 'error');
                alert(errMsg);
            }
        } catch (err) {
            console.error('Network or parsing error:', err);
            setImageStatus('Network error', 'error');
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
                <h2 class="recipe-title">${escapeHtml(recipe.title)}</h2>
                <span class="recipe-type">${escapeHtml(recipe.type || '')}</span>
                <div class="recipe-meta">
                    <span>${escapeHtml(String(recipe.prepTime || 0))} min</span>
                    <span>${escapeHtml(String(recipe.rating?.average || 0))}/5 (${escapeHtml(String(recipe.rating?.count || 0))} ratings)</span>
                </div>
                <div class="recipe-ingredients">
                    <strong>Ingredients:</strong> ${(recipe.ingredients || []).slice(0, 3).map(escapeHtml).join(', ')}${(recipe.ingredients || []).length > 3 ? '…' : ''}
                </div>
                <div class="recipe-owner">
                    <p>Made by: ${escapeHtml(profileData.username)}</p>
                </div>
                <div class="recipe-actions">
                    <button class="view-recipe-btn" onclick="viewRecipe('${recipe._id}')">View Recipe</button>
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
                <h2 class="recipe-title">${escapeHtml(recipe.title)}</h2>
                <span class="recipe-type">${escapeHtml(recipe.type || '')}</span>
                <div class="recipe-meta">
                    <span>⏱${escapeHtml(String(recipe.prepTime || 0))} min</span>
                    <span>${escapeHtml(String(recipe.rating?.average || 0))}/5 (${escapeHtml(String(recipe.rating?.count || 0))} ratings)</span>
                </div>
                <div class="recipe-ingredients">
                    <strong>Ingredients:</strong> ${(recipe.ingredients || []).slice(0, 3).map(escapeHtml).join(', ')}${(recipe.ingredients || []).length > 3 ? '…' : ''}
                </div>
                <div class="recipe-owner">
                    <p>Made by: ${escapeHtml(recipe.ownerName || recipe.ownerId)}</p>
                </div>
                <div class="recipe-actions">
                    <button class="view-recipe-btn" onclick="viewRecipe('${recipe._id}')">View Recipe</button>
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
        dynamic.innerHTML = await res.text();

        // wire up tabs
        dynamic.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                dynamic.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                dynamic.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                dynamic.querySelector(`#${tab.dataset.target}`).classList.add('active');
            });
        });

        // initialize form handlers now that the form exists
        initSubmitRecipe();

        renderMyPosts();
        renderSavedRecipes();
    } catch (err) {
        console.error("Error loading My Recipes:", err);
        dynamic.innerHTML = "<p>Could not load My Recipes.</p>";
    }
}


function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

    // initialize submit handler once
    // initSubmitRecipe();
    loadAccount();
});
