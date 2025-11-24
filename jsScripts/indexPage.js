let start = document.getElementById("startButton");

const toggleBtn = document.getElementById("toggleTipsBtn");
const tipsSection = document.getElementById("tipsSection");

start.addEventListener('click', function () {
    const target = document.querySelector('.section-title');
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }
});

toggleBtn.addEventListener("click", () => {
    tipsSection.classList.toggle("hidden");
    toggleBtn.textContent = tipsSection.classList.contains("hidden")
        ? "Show Cooking Tips"
        : "Hide Cooking Tips";
});