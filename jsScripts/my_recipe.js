let profileData = null;
let allRecipes = [];


async function loadAccount() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/profile", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok || data.message === "Not logged in") return;

        profileData = data;

        await loadAllRecipes();
        renderMyPosts();
        renderSavedRecipes();
    } catch (err) {
        console.error("Error loading account:", err);
    }
}


async function loadAllRecipes() {
    try {
        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/recipes");
        const data = await res.json();
        if (res.ok) allRecipes = data.recipes;
    } catch (err) {
        console.error("Error loading recipes:", err);
    }
}

function setImageStatus(text, cls = "") {
    const el = document.getElementById('imageStatus');
    if (el) {
        el.textContent = text;
        el.className = 'image-status ' + cls;
    }
}

// submit recipe
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

        // Catch every single input
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

        // Checker for photo (credit: code from google)
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
            const token = localStorage.getItem("token");
            const res = await fetch('https://tastebytes-6498b743cd23.herokuapp.com/post_recipe', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd
            });
            const data = await res.json();
            if (res.ok) {
                setImageStatus('Image uploaded', 'uploaded');
                showNotification('Recipe posted successfully!', 3000);
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
    window.location.href = `view-recipe.html?id=${recipeId}`;
}

// get posts
function renderMyPosts() {
    const postsContainer = document.getElementById("myPostsList");
    if (!profileData || !allRecipes.length) {
        postsContainer.innerHTML = "<p>No posts yet.</p>"; return;
    }
    const posts = allRecipes.filter(r => profileData.posts.includes(r._id));
    postsContainer.innerHTML = posts.length ? posts.map(r => `
    <div class="recipe-card">
      <h2>${r.title}</h2>
      <span>${r.type || ''}</span>
      <div><span>${String(r.prepTime || 0)} min</span>
      <span>★${String(r.rating?.average || 0)}/5 (${String(r.rating?.count || 0)})</span></div>
      <div><strong>Ingredients:</strong> ${(r.ingredients || []).slice(0, 3).join(', ')}${(r.ingredients || []).length > 3 ? '…' : ''}</div>
      <p>Made by: ${profileData.username}</p>
      <button onclick="viewRecipe('${r._id}')">View Recipe</button>
    </div>`).join("") : "<p>No posts yet.</p>";
}


// get saved
function renderSavedRecipes() {
    const savedContainer = document.getElementById("savedRecipesList");
    if (!profileData || !allRecipes.length) {
        savedContainer.innerHTML = "<p>No saved recipes yet.</p>"; return;
    }
    const saved = allRecipes.filter(r => profileData.savedRecipes.includes(r._id));
    savedContainer.innerHTML = saved.length ? saved.map(r => `
    <div class="recipe-card">
      <h2>${r.title}</h2>
      <span>${r.type || ''}</span>
      <div><span>⏱${String(r.prepTime || 0)} min</span>
      <span>★${String(r.rating?.average || 0)}/5 (${String(r.rating?.count || 0)})</span></div>
      <div><strong>Ingredients:</strong> ${(r.ingredients || []).slice(0, 3).join(', ')}${(r.ingredients || []).length > 3 ? '…' : ''}</div>
      <p>Made by: ${r.ownerName || r.ownerId}</p>
      <button onclick="viewRecipe('${r._id}')">View Recipe</button>
    </div>`).join("") : "<p>No saved recipes yet.</p>";
}

// initialize tabs
function initTabs() {
    const tabs = document.querySelectorAll(".tab");
    const contents = document.querySelectorAll(".content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const targetId = tab.dataset.target;
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add("active");
        });
    });
}

window.addEventListener("load", () => {
    initTabs();
    initSubmitRecipe();
    loadAccount();
});

