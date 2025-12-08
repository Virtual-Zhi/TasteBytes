let recipes = [];
let userCollection = new Set();
let isLoggedIn = false;
let userPlan;

async function checkLogin() {
    try {
        const res = await fetch('https://tastebytes-6498b743cd23.herokuapp.com/profile', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            isLoggedIn = true;
            userCollection = new Set(data.user.savedRecipes || []);

            userPlan = data.user.plan || "Free";
        } else {
            isLoggedIn = false;
        }
    } catch {
        isLoggedIn = false;
    }
}

async function loadRecipes() {
    try {
        const res = await fetch('https://tastebytes-6498b743cd23.herokuapp.com/recipes/', { credentials: 'include' });
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
        let buttons = `<button class="view-recipe-btn" onclick="viewRecipe('${recipe._id}')">View Recipe</button>`;
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

// Search + filter: name search runs only when includeName is true
function filterRecipes(includeName = false) {
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const ingredientFilter = (document.getElementById('ingredientFilter')?.value || '').toLowerCase();
    const timeFilter = document.getElementById('timeFilter')?.value || '';
    const nameSearch = includeName ? (document.getElementById('pageSearchInput')?.value || '').trim().toLowerCase() : '';

    const filtered = recipes.filter(recipe => {
        const matchesType = !typeFilter || (recipe.type || '') === typeFilter;
        const matchesIngredient = !ingredientFilter || (recipe.ingredients || []).some(ing => ing.toLowerCase().includes(ingredientFilter));
        const matchesTime = !timeFilter || (Number(recipe.prepTime || 0) <= parseInt(timeFilter));
        const matchesName = !nameSearch || (recipe.title || '').toLowerCase().includes(nameSearch);
        return matchesType && matchesIngredient && matchesTime && matchesName;
    });

    renderRecipes(filtered);
}

async function toggleCollection(recipeId) {
    const alreadySaved = userCollection.has(recipeId);
    const endpoint = alreadySaved ? "remove_recipe" : "save_recipe";

    if (!alreadySaved && userPlan == "Free" && userCollection.size >= 5) {
        showModal("Free Limit Reached", "You've reached the save limit for Free plan. Please upgrade to Premium for unlimited saves");
        return;
    }

    if (endpoint == "remove_recipe") {
        showNotification("Removed from saved", 3000);
    } else {
        showNotification("Added to saved collection", 3000);
    }

    const res = await fetch(`https://tastebytes-6498b743cd23.herokuapp.com/${endpoint}`, {
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
    const searchInput = document.getElementById('pageSearchInput');
    if (searchInput) searchInput.value = '';
    filterRecipes();
}

const typeEl = document.getElementById('typeFilter');
const ingEl = document.getElementById('ingredientFilter');
const timeEl = document.getElementById('timeFilter');
const searchInput = document.getElementById('pageSearchInput');
const searchBtn = document.getElementById('pageSearchBtn');
const clearBtn = document.querySelector('.clear-filters-btn');

if (typeEl)
    typeEl.addEventListener('change', () => filterRecipes(false));
if (ingEl)
    ingEl.addEventListener('input', () => filterRecipes(false));
if (timeEl)
    timeEl.addEventListener('input', () => filterRecipes(false));

if (searchBtn) searchBtn.addEventListener('click', () => filterRecipes(true));
if (clearBtn) clearBtn.addEventListener('click', () => {
    document.getElementById('typeFilter').value = '';
    document.getElementById('ingredientFilter').value = '';
    document.getElementById('timeFilter').value = '';
    if (searchInput)
        searchInput.value = '';
    filterRecipes(false);
});

async function loader() {
    await checkLogin();
    await loadRecipes();

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    if (q && searchInput) {
        searchInput.value = q;
        filterRecipes(true);
    } else
        filterRecipes(false);
}

loader();

