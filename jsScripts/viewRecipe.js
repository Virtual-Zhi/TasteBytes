let profileData = null;
const recipeId = new URLSearchParams(window.location.search).get("id");
const stars = document.querySelectorAll(".star");
const ratingDisplay = document.getElementById("ratingDisplay");

// load account info if logged in
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
      localStorage.removeItem("token");
    }
  } catch {
    // ignore errors
  }
}

// load a single recipe by id
async function loadRecipe() {
  try {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(
      `https://tastebytes-6498b743cd23.herokuapp.com/recipes/${recipeId}`,
      { headers }
    );
    const data = await res.json();
    if (!res.ok || !data.recipe) throw new Error();

    showRecipe(data.recipe);
    setupRating(recipeId, data.recipe.rating, data.userRating);
  } catch {
    document.getElementById("recipeName").textContent = "error loading recipe";
    document.getElementById("instructions").textContent = "please try again later.";
  }
}

// render recipe details into the page
function showRecipe(recipe) {
  document.getElementById("recipeName").textContent = recipe.title || "untitled";
  document.getElementById("recipeType").textContent = recipe.type || "unknown";
  document.getElementById("prepTime").textContent = recipe.prepTime ?? 0;

  document.getElementById("imageContainer").innerHTML = recipe.imageUrl
    ? `<img src="${recipe.imageUrl}" alt="${recipe.title || "recipe image"}" class="recipe-image">`
    : '<div class="no-image">📷</div>';

  document.getElementById("ingredientsList").innerHTML = (recipe.ingredients || [])
    .map((i) => `<li>${i}</li>`)
    .join("");

  document.getElementById("instructions").textContent =
    recipe.instructions || recipe.tips || "no instructions provided.";
}

// setup rating stars and click handlers
function setupRating(recipeId, ratingObj, userRating) {
  ratingDisplay.textContent = ratingObj?.count
    ? `average: ${Number(ratingObj.average).toFixed(1)} (${ratingObj.count} ratings)`
    : "click a star to rate";

  if (userRating) {
    updateStars(userRating);
    ratingDisplay.textContent = `your rating: ${userRating} ★ — average: ${Number(
      ratingObj.average
    ).toFixed(1)} (${ratingObj.count} ratings)`;
  }

  stars.forEach((star) => {
    star.onclick = async () => {
      if (!profileData) {
        ratingDisplay.textContent = "you must be logged in to rate";
        return;
      }
      const rating = +star.dataset.rating;
      try {
        const data = await submitRating(recipeId, rating);
        updateStars(data.userRating);
        ratingDisplay.textContent = `you rated ${data.userRating} ★ — new average: ${Number(
          data.rating.average
        ).toFixed(1)} (${data.rating.count} ratings)`;
      } catch {
        ratingDisplay.textContent = "unable to save rating right now.";
      }
    };
  });
}

// update star visuals
function updateStars(rating) {
  stars.forEach((star, i) => star.classList.toggle("active", i < rating));
}

// submit rating to backend
async function submitRating(recipeId, rating) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("not logged in");

  const res = await fetch(
    `https://tastebytes-6498b743cd23.herokuapp.com/recipes/${recipeId}/rate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rating })
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error();
  return data;
}

// initial load
loadAccount();
loadRecipe();

// reload recipe if page is restored from cache
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    loadRecipe();
  }
});
