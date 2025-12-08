document.getElementById("checkout-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
        const res = await fetch("https://tastebytes-6498b743cd23.herokuapp.com/get_premium", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok) {
            alert("Thank you! You have premium now!");
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error connecting to server");
    }
});