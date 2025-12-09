// get hamburger menu and nav links elements
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

// html content for the popup modals
const termsContent = `
    <p>By accessing and using TasteBytes, you agree to follow our community guidelines and policies. 
    Memberships and recipe submissions are non-transferable. We reserve the right to update these terms at any time.</p>
    <ul>
        <li>Share recipes and content responsibly and respectfully.</li>
        <li>Respect fellow foodies and community members.</li>
        <li>Payments for premium features or subscriptions must be completed before access.</li>
        <li>TasteBytes is not liable for personal outcomes from recipes or shared content.</li>
    </ul>
`;

const privacyContent = `
    <p>TasteBytes values your privacy. We collect only the information necessary to provide services, 
    such as recipe sharing, account management, and community interaction. Your data will never be sold to third parties.</p>
    <ul>
        <li>We may use your email to send updates about new recipes, tips, and community events.</li>
        <li>Personal data is stored securely and used only for TasteBytes-related purposes.</li>
        <li>You may request deletion of your account and data at any time.</li>
    </ul>
`;

// toggle hamburger menu open/close
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// shrink navbar when scrolling down
window.addEventListener("scroll", function () {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > 25) {
        navbar.classList.add("shrink");
    } else {
        navbar.classList.remove("shrink");
    }
});

// check login status and update nav links accordingly
window.onload = async () => {
    const navLinks = document.getElementById("navLinks");
    const signinBtn = document.querySelector(".signin-btn");

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            // if no token, show sign in link
            signinBtn.textContent = "Sign In";
            if (location.pathname.endsWith("index.html") || location.pathname.endsWith("TasteBytes/")) {
                signinBtn.href = "./pages/login.html";
            } else {
                signinBtn.href = "login.html";
            }
            return;
        }

        // fetch profile with token
        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/profile", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();

            // remove sign in button and add dropdown menu
            navLinks.removeChild(signinBtn);

            const profileMenu = document.createElement("div");
            profileMenu.classList.add("dropdown");

            const path = window.location.pathname;
            const prefix = path.includes("/pages/") ? "../" : "./";

            profileMenu.innerHTML = `
        <button class="dropbtn">${data.username} ▼</button>
        <div class="dropdown-content">
            <a href="${prefix}pages/my_account.html">Profile</a>
            <a href="${prefix}pages/my_recipes.html">My Recipes</a>
            <a href="${prefix}pages/my_recipes.html">Upload a Recipe</a>
            <a href="#" id="logoutBtn">Logout</a>
        </div>
    `;

            navLinks.appendChild(profileMenu);

            // logout handler
            document.getElementById("logoutBtn").addEventListener("click", async (e) => {
                e.preventDefault();
                await fetch("https://tastebytes-6498b743cd23.herokuapp.com/logout", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
                localStorage.removeItem("token");
                alert("Logged out!");
                if (location.pathname.endsWith("my_account.html")) {
                    location = "../index.html";
                } else {
                    location.reload();
                }
            });
        } else {
            // if token invalid, reset to sign in
            localStorage.removeItem("token");
            signinBtn.textContent = "Sign In";
            if (location.pathname.endsWith("index.html") || location.pathname.endsWith("TasteBytes/")) {
                signinBtn.href = "./pages/login.html";
            } else {
                signinBtn.href = "login.html";
            }
        }
    } catch (err) {
        console.error("error checking login:", err);
    }
};

// show notification banner
function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, duration);
}

// show modal popup
function showModal(title, message) {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    modalTitle.textContent = title;
    modalMessage.innerHTML = message;
    modal.style.display = 'block';
}

// subscribe form handler
document.getElementById('subscribe-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const emailInput = document.getElementById('subscribeEmail');
    const email = emailInput.value.trim();

    if (email) {
        showNotification(`Successfully subscribed with: ${email}`);
        showModal('Subscription Confirmed', `Thank you for subscribing!\n\nYou'll receive updates at: ${email}`);
        emailInput.value = '';
    }
});

// close modal button
document.getElementById('closeModal').addEventListener('click', function () {
    document.getElementById('eventModal').style.display = 'none';
});

// close modal when clicking outside of it
window.addEventListener('click', function (event) {
    const modal = document.getElementById('eventModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// open terms modal
document.getElementById('termsLink').addEventListener('click', (e) => {
    e.preventDefault();
    showModal('Terms & Conditions', termsContent);
    showNotification('Opened Terms & Conditions');
});

// open privacy modal
document.getElementById('privacyLink').addEventListener('click', (e) => {
    e.preventDefault();
    showModal('Privacy Policy', privacyContent);
    showNotification('Opened Privacy Policy');
});
