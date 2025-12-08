let start = document.getElementById("startButton");
const toggleBtn = document.getElementById("toggleTipsBtn");
const tipsSection = document.getElementById("tipsSection");

// search bar
let recipeSearch = document.getElementById("recipeSearch");
let searchButton = document.getElementById("searchButton");

if (start) {
    start.addEventListener('click', function () {
        const target = document.querySelector('.section-title');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

if (toggleBtn && tipsSection) {
    toggleBtn.addEventListener("click", () => {
        tipsSection.classList.toggle("hidden");
        toggleBtn.textContent = tipsSection.classList.contains("hidden")
            ? "Show Cooking Tips"
            : "Hide Cooking Tips";
    });
}

function goToRecipes(q) {
    const base = './pages/recipes.html';
    const url = q ? `${base}?q=${encodeURIComponent(q)}` : base;
    window.location.href = url;
}

if (searchButton) {
    searchButton.addEventListener('click', () => {
        const q = recipeSearch?.value?.trim() || '';
        goToRecipes(q);
    });
}

if (recipeSearch) {
    recipeSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const q = recipeSearch.value.trim();
            goToRecipes(q);
        }
    });
}
