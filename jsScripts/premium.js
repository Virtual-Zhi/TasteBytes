const loginForm = document.getElementById("loginForm");
const createForm = document.getElementById("createForm");
const formTitle = document.getElementById("formTitle");

//this 
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    document.body.innerHTML = '<h1 style="color: white; font-size: 30px; text-align: center "> Success! Thank you for your purchase. You are now on a Premium plan. </h1>'; 
});

/// 