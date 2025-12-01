let recipes = [];
let userCollection = new Set();
let isLoggedIn = false;

async function checkLogin() {
    try {
        const res = await fetch('http://localhost:8080/profile', {
            method: 'GET',
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            isLoggedIn = true;

            userCollection = new Set(data.user.savedRecipes || []);
        } else {
            isLoggedIn = false;
        }
    } catch (err) {
        console.error('Login check failed:', err);
        isLoggedIn = false;
    }
}

async function loadRecipes() {
    try {
        const res = await fetch('http://localhost:8080/recipes', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await res.json();

        if (res.ok) {
            recipes = data.recipes;
            filterRecipes();
        } else {
            console.error(data.message || 'Error fetching recipes');
            document.getElementById('recipesGrid').innerHTML =
                '<div class="no-results">Error loading recipes.</div>';
        }
    } catch (err) {
        console.error('Network error:', err);
        document.getElementById('recipesGrid').innerHTML =
            '<div class="no-results">Network error loading recipes.</div>';
    }
}

function renderRecipes(recipesToShow) {
    const grid = document.getElementById('recipesGrid');

    if (!recipesToShow || recipesToShow.length === 0) {
        grid.innerHTML = '<div class="no-results">No recipes found matching your filters.</div>';
        return;
    }

    grid.innerHTML = recipesToShow.map(recipe => {
        let buttons = `
            <button class="view-recipe-btn" onclick="viewRecipe('${recipe._id}')">
                👀 View Recipe
            </button>
        `;

        if (isLoggedIn) {
            buttons += `
                <button 
                    class="add-to-collection-btn ${userCollection.has(recipe._id) ? 'added' : ''}" 
                    onclick="toggleCollection('${recipe._id}')">
                    ${userCollection.has(recipe._id) ? '✓ In Collection' : '+ Add to Collection'}
                </button>
            `;
        }

        return `
        <div class="recipe-card">
            <div class="recipe-image">🍴</div>
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
                    ${buttons}
                </div>
            </div>
        </div>`;
    }).join('');
}


function filterRecipes() {
    const typeFilter = document.getElementById('typeFilter').value;
    const ingredientFilter = document.getElementById('ingredientFilter').value.toLowerCase();
    const timeFilter = document.getElementById('timeFilter').value;

    let filtered = recipes.filter(recipe => {
        const matchesType = !typeFilter || recipe.type === typeFilter;
        const matchesIngredient = !ingredientFilter ||
            (recipe.ingredients || []).some(ing => ing.toLowerCase().includes(ingredientFilter));
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
        if (alreadySaved) {
            userCollection.delete(recipeId);
            console.log(`Recipe ${recipeId} removed from collection`);
        } else {
            userCollection.add(recipeId);
            console.log(`Recipe ${recipeId} added to collection`);
        }
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

// Event listeners
document.getElementById('typeFilter').addEventListener('change', filterRecipes);
document.getElementById('ingredientFilter').addEventListener('input', filterRecipes);
document.getElementById('timeFilter').addEventListener('input', filterRecipes);

// Initial load from DB
async function loader() {
    await checkLogin(); 
    await loadRecipes();
}

loader();