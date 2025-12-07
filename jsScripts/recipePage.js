let recipes = [];
let userCollection = new Set();
let isLoggedIn = false;

async function checkLogin() {
    try {
        const res = await fetch('http://localhost:8080/profile', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            isLoggedIn = true;
            userCollection = new Set(data.user.savedRecipes || []);
        } else {
            isLoggedIn = false;
        }
    } catch {
        isLoggedIn = false;
    }
}

async function loadRecipes() {
    try {
        const res = await fetch('http://localhost:8080/recipes/', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            recipes = data.recipes;
            filterRecipes();
        } else {
            document.getElementById('recipesGrid').innerHTML =
                '<div class="no-results">Error loading recipes.</div>';
        }
    } catch {
        document.getElementById('recipesGrid').innerHTML =
            '<div class="no-results">Network error loading recipes.</div>';
    }
}

function viewRecipe(recipeId) {
    window.location.href = `../pages/view-recipe.html?id=${recipeId}`;
}

function renderRecipes(recipesToShow) {
    const grid = document.getElementById('recipesGrid');
    if (!recipesToShow?.length) {
        grid.innerHTML = '<div class="no-results">No recipes found matching your filters.</div>';
        return;
    }

    grid.innerHTML = recipesToShow.map(recipe => {
        const imgSrc = recipe.imageUrl || '../images/homePage.jpg';
        const avgRating = recipe.rating?.average ? Number(recipe.rating.average).toFixed(1) : "0.0";
        const ratingCount = recipe.rating?.count || 0;
        let buttons = `<button class="view-recipe-btn" onclick="viewRecipe('${recipe._id}')">👀 View Recipe</button>`;
        if (isLoggedIn) {
            const added = userCollection.has(recipe._id);
            buttons += `<button class="add-to-collection-btn ${added ? 'added' : ''}" onclick="toggleCollection('${recipe._id}')">
                ${added ? '✓ In Collection' : '+ Add to Collection'}
            </button>`;
        }

        return `
          <div class="recipe-card">
            <div class="recipe-image">
              <img src="${imgSrc}" alt="${escapeHtml(recipe.title || 'Recipe image')}" loading="lazy" />
            </div>
            <div class="recipe-content">
              <h2 class="recipe-title">${escapeHtml(recipe.title)}</h2>
              <span class="recipe-type">${escapeHtml(recipe.type || '')}</span>
              <div class="recipe-meta">
                <span>⏱ ${escapeHtml(String(recipe.prepTime || 0))} min</span>
                <span>⭐ ${avgRating}/5 (${ratingCount} ratings)</span>
              </div>
              <div class="recipe-ingredients">
                <strong>Ingredients:</strong> ${escapeHtml((recipe.ingredients || []).slice(0, 3).join(', '))}${(recipe.ingredients || []).length > 3 ? '…' : ''}
              </div>
              <div class="recipe-owner">
                <p>Made by: ${escapeHtml(recipe.ownerName || recipe.ownerId)}</p>
              </div>
              <div class="recipe-actions">${buttons}</div>
            </div>
          </div>`;
    }).join('');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function filterRecipes() {
    const typeFilter = document.getElementById('typeFilter').value;
    const ingredientFilter = document.getElementById('ingredientFilter').value.toLowerCase();
    const timeFilter = document.getElementById('timeFilter').value;

    const filtered = recipes.filter(recipe => {
        const matchesType = !typeFilter || recipe.type === typeFilter;
        const matchesIngredient = !ingredientFilter || (recipe.ingredients || []).some(ing => ing.toLowerCase().includes(ingredientFilter));
        const matchesTime = !timeFilter || recipe.prepTime <= parseInt(timeFilter);
        return matchesType && matchesIngredient && matchesTime;
    });

    renderRecipes(filtered);
}

async function toggleCollection(recipeId) {
    const alreadySaved = userCollection.has(recipeId);
    const endpoint = alreadySaved ? "remove_recipe" : "save_recipe";

    const res = await fetch(`http://localhost:8080/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
        credentials: "include"
    });

    const data = await res.json();
    if (res.ok) {
        alreadySaved ? userCollection.delete(recipeId) : userCollection.add(recipeId);
        filterRecipes();
    } else {
        alert("Error: " + data.message);
    }
}

function clearFilters() {
    document.getElementById('typeFilter').value = '';
    document.getElementById('ingredientFilter').value = '';
    document.getElementById('timeFilter').value = '';
    filterRecipes();
}

document.getElementById('typeFilter').addEventListener('change', filterRecipes);
document.getElementById('ingredientFilter').addEventListener('input', filterRecipes);
document.getElementById('timeFilter').addEventListener('input', filterRecipes);

async function loader() {
    await checkLogin();
    await loadRecipes();
}

loader();
