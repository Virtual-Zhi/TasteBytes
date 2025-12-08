let profileData = null;
const recipeId = new URLSearchParams(window.location.search).get('id');
const stars = document.querySelectorAll('.star');
const ratingDisplay = document.getElementById('ratingDisplay');

async function loadAccount() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && !data.error && data.message !== "Not logged in") {
      profileData = data;
    } else {
      localStorage.removeItem("token"); // clear invalid token
    }
  } catch {
    // silently fail
  }
}

async function loadRecipe() {
  try {
    const res = await fetch(`https://tastebytes-6498b743cd23.herokuapp.com/recipes/${recipeId}`);
    const data = await res.json();
    if (!res.ok || !data.recipe) throw new Error();
    showRecipe(data.recipe);
    setupRating(recipeId, data.recipe.rating, data.recipe.userRating);
  } catch {
    document.getElementById('recipeName').textContent = 'Error loading recipe';
    document.getElementById('instructions').textContent = 'Please try again later.';
  }
}

function showRecipe(recipe) {
  document.getElementById('recipeName').textContent = recipe.title || 'Untitled';
  document.getElementById('recipeType').textContent = recipe.type || 'Unknown';
  document.getElementById('prepTime').textContent = recipe.prepTime ?? 0;

  document.getElementById('imageContainer').innerHTML = recipe.imageUrl
    ? `<img src="${recipe.imageUrl}" alt="${escapeHtml(recipe.title || 'Recipe image')}" class="recipe-image">`
    : '<div class="no-image">📷</div>';

  document.getElementById('ingredientsList').innerHTML =
    (recipe.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');

  document.getElementById('instructions').textContent =
    recipe.instructions || recipe.tips || 'No instructions provided.';
}

function setupRating(recipeId, ratingObj, userRating) {
  ratingDisplay.textContent = ratingObj?.count
    ? `Average: ${Number(ratingObj.average).toFixed(1)} (${ratingObj.count} ratings)`
    : 'Click a star to rate';

  if (userRating) {
    updateStars(userRating);
    ratingDisplay.textContent = `Your rating: ${userRating} ★ — Average: ${Number(ratingObj.average).toFixed(1)} (${ratingObj.count} ratings)`;
  }

  stars.forEach(star => star.onclick = async () => {
    if (!profileData) {
      ratingDisplay.textContent = "You must be logged in to rate";
      return;
    }
    const rating = +star.dataset.rating;
    try {
      const updated = await submitRating(recipeId, rating);
      updateStars(rating);
      ratingDisplay.textContent = `You rated ${rating} ★ — New average: ${Number(updated.average).toFixed(1)} (${updated.count} ratings)`;
    } catch {
      ratingDisplay.textContent = "Unable to save rating right now.";
    }
  });
}

function updateStars(rating) {
  stars.forEach((star, i) => star.classList.toggle('active', i < rating));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function submitRating(recipeId, rating) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const res = await fetch(`https://tastebytes-6498b743cd23.herokuapp.com/recipes/${recipeId}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ rating })
  });
  const data = await res.json();
  if (!res.ok) throw new Error();
  if (data.userRating) updateStars(data.userRating);
  return data.rating;
}

loadAccount();
loadRecipe();
