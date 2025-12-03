async function loadRecipeDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    if (!recipeId) {
        document.getElementById('recipeDetail').innerHTML = '<p>Recipe not found.</p>';
        return;
    }

    try {
        const res = await fetch(`http://localhost:8080/recipe/${recipeId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();
            renderRecipeDetail(data.recipe);
        } else {
            document.getElementById('recipeDetail').innerHTML = '<p>Error loading recipe.</p>';
        }
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('recipeDetail').innerHTML = '<p>Network error loading recipe.</p>';
    }
}

function renderRecipeDetail(recipe) {
    const detailDiv = document.getElementById('recipeDetail');
    detailDiv.innerHTML = `
        <div class="recipe-detail">
            <h1>${recipe.title}</h1>
            <div class="recipe-meta">
                <span class="recipe-type">${recipe.type}</span>
                <span>⏱️ ${recipe.prepTime} minutes</span>
                <span>⭐ ${recipe.rating?.average || 0}/5 (${recipe.rating?.count || 0} ratings)</span>
            </div>
            
            <div class="recipe-body">
                <section class="ingredients-section">
                    <h2>Ingredients</h2>
                    <ul>
                        ${(recipe.ingredients || []).map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </section>

                <section class="instructions-section">
                    <h2>Instructions</h2>
                    <ol>
                        ${(recipe.instructions || []).map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </section>

                <section class="owner-section">
                    <p>Made by: <strong>${recipe.ownerName || recipe.ownerId}</strong></p>
                </section>
            </div>
        </div>
    `;
}

loadRecipeDetail();