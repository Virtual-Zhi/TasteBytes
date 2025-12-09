const loginForm = document.getElementById("loginForm");
const createForm = document.getElementById("createForm");
const formTitle = document.getElementById("formTitle");

//this 
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const name = document.getElementById("name").value;
    const number = document.getElementById("number").value;
    const message = document.getElementById("message").value;
    
    showModal("Thank you", "We greatly appreciate any feedback and we will respond to inquiries as soon as we can!");

    this.reset(); 

});
 