const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

// HTML content for the popup
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


hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});


window.addEventListener("scroll", function () {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > 25) {
        navbar.classList.add("shrink");
    } else {
        navbar.classList.remove("shrink");
    }
});


window.onload = async () => {
    const navLinks = document.getElementById("navLinks");
    const signinBtn = document.querySelector(".signin-btn");

    try {
        const res = await fetch("http://localhost:8080/profile", {
            method: "GET",
            credentials: "include"
        });

        if (res.ok) {
            const data = await res.json();


            navLinks.removeChild(signinBtn);

            const profileMenu = document.createElement("div");
            profileMenu.classList.add("dropdown");

            // figure out how deep we are in the folder structure
            const path = window.location.pathname;
            const prefix = path.includes("/pages/") ? "../" : "./";

            profileMenu.innerHTML = `
                <button class="dropbtn">${data.user.username} ▼</button>
                <div class="dropdown-content">
                    <a href="${prefix}pages/my_account.html">Profile</a>
                    <a href="${prefix}htmlPages/saved.html">Saved Recipes</a>
                    <a href="#" id="logoutBtn">Logout</a>
                </div>
            `;

            navLinks.appendChild(profileMenu);


            document.getElementById("logoutBtn").addEventListener("click", async (e) => {
                e.preventDefault();
                await fetch("http://localhost:8080/logout", {
                    method: "POST",
                    credentials: "include"
                });
                alert("Logged out!");
                location.reload();
            });
        } else {

            signinBtn.textContent = "Sign In";
            signinBtn.href = "./pages/login.html";
        }
    } catch (err) {
        console.error("Error checking login:", err);
    }
}



function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, duration);
}


function showModal(title, message) {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    modalTitle.textContent = title;
    modalMessage.innerHTML = message;
    modal.style.display = 'block';
}


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


document.getElementById('closeModal').addEventListener('click', function () {
    document.getElementById('eventModal').style.display = 'none';
});


window.addEventListener('click', function (event) {
    const modal = document.getElementById('eventModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

document.getElementById('termsLink').addEventListener('click', (e) => {
    e.preventDefault();
    showModal('Terms & Conditions', termsContent);
    showNotification('Opened Terms & Conditions');
});

document.getElementById('privacyLink').addEventListener('click', (e) => {
    e.preventDefault();
    showModal('Privacy Policy', privacyContent);
    showNotification('Opened Privacy Policy');
});