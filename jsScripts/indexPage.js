const startButton = document.getElementById("startButton");
const recipeSearchInput = document.getElementById("recipeSearch");
const recipeSearchBtn = document.getElementById("searchButton");

if (startButton) {
    startButton.addEventListener("click", () => {
        const target = document.querySelector(".section-title");
        if (target) target.scrollIntoView({ behavior: "smooth" });
    });
}

if (recipeSearchBtn) {
    recipeSearchBtn.addEventListener("click", () => {
        let q = recipeSearchInput?.value?.trim() || "";
        q = q.replace(/[?#&]/g, "").replace(/\s+/g, "+");
        const base = "./pages/recipes.html";
        const url = q ? `${base}?q=${q}` : base;
        window.location.href = url;
    });
}

if (recipeSearchInput) {
    recipeSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            recipeSearchBtn?.click();
        }
    });
}

function viewRecipe(id) {
    window.location.href = `./pages/view-recipe.html?id=${id}`;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function shortIngredients(arr, maxItems = 3) {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    const items = arr.slice(0, maxItems);
    return items.join(", ") + (arr.length > maxItems ? "…" : "");
}

function shortText(str, maxWords = 20) {
    if (!str) return "";
    const words = str.trim().split(/\s+/);
    if (words.length <= maxWords) return words.join(" ");
    return words.slice(0, maxWords).join(" ") + "…";
}

async function fetchAndRenderHighlights() {
    try {
        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/recipes/", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch recipes");
        const payload = await res.json();
        const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];

        recipes.forEach(r => { r._avg = Number(r.rating?.average || 0); });

        const shuffled = shuffle(recipes.slice());
        shuffled.sort((a, b) => b._avg - a._avg);
        const featured = shuffled.slice(0, 3);
        renderFeatured(featured);

        const maxAvg = recipes.reduce((m, r) => Math.max(m, r._avg || 0), 0);
        const topCandidates = recipes.filter(r => (r._avg || 0) === maxAvg);
        const spotlight = topCandidates.length ? topCandidates[Math.floor(Math.random() * topCandidates.length)] : (recipes[0] || null);
        renderSpotlight(spotlight);
    } catch (err) {
        console.error("Error loading highlights:", err);
    }
}

function renderFeatured(items) {
    const grid = document.querySelector(".featured-recipes .recipe-grid");
    if (!grid) return;
    if (!items || items.length === 0) {
        grid.innerHTML = '<div class="no-results">No featured recipes available.</div>';
        return;
    }

    grid.innerHTML = items.map(r => {
        const img = r.imageUrl || "./images/homePage.jpg";
        const title = r.title || "Untitled";
        const ingredients = shortIngredients(r.ingredients, 3);
        const instrPreview = shortText(r.instructions || "", 18);
        const desc = ingredients || instrPreview;
        return `
      <div class="recipe-card">
        <div class="card-image">
          <img src="${img}" alt="${title}">
        </div>
        <h4>${title}</h4>
        <p class="card-desc">${desc}</p>
        <button class="recipe-link" onclick="viewRecipe('${r._id}')">View Recipe</button>
      </div>
    `;
    }).join("");
}

function renderSpotlight(r) {
    const container = document.querySelector(".spotlight-section .spotlight-card");
    if (!container) return;
    if (!r) {
        container.innerHTML = "<p>No spotlight recipe available.</p>";
        return;
    }

    const img = r.imageUrl || "../images/homePage.jpg";
    const title = r.title || "Untitled";
    const ingredients = shortIngredients(r.ingredients, 4);
    const instrPreview = shortText(r.instructions || "", 30);
    const desc = ingredients || instrPreview;

    container.innerHTML = `
    <div class="spotlight-image">
      <img src="${img}" alt="${title}">
    </div>
    <h4>${title}</h4>
    <p class="spotlight-desc">${desc}</p>
    <button class="recipe-link" onclick="viewRecipe('${r._id}')">View Recipe</button>
  `;
}

fetchAndRenderHighlights();