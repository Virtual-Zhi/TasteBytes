const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");


async function handleAuth(req, res, sessions) {
    const db = getDB();

    if (req.method === "POST" && req.url === "/create_account") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { newUsername, newEmail, newPassword, newPhone, plan } = JSON.parse(body);

                const existingUser = await db.collection("users").findOne({ username: newUsername });
                if (existingUser) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "Username already exists" }));
                }

                await db.collection("users").insertOne({
                    username: newUsername,
                    email: newEmail,
                    phone: newPhone,
                    plan: plan || "Free",
                    password: newPassword,
                    posts: [],
                    savedRecipes: [],
                    createdAt: new Date(),
                    lastLogin: null,
                });
                res.end(JSON.stringify({ message: "Account created successfully!" }));
            } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: "Error creating account", error: err.message }));
            }
        });
        return true;
    }

    if (req.method === "POST" && req.url === "/login") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { email, password } = JSON.parse(body);
                const user = await db.collection("users").findOne({ email });

                if (!user) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "User not found" }));
                }

                if (password != user.password) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "Invalid credentials" }));
                }

                const sessionId = user._id.toString();
                sessions[sessionId] = { id: user._id.toString(), username: user.username };

                res.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly; Path=/`);
                res.end(JSON.stringify({ message: "Login successful!", username: user.username }));
            } catch (err) {
                console.error("Login error:", err);
                res.statusCode = 500;
                res.end(JSON.stringify({ message: "Server error", error: err.message }));
            }
        });
        return true;
    }

    if (req.method === "POST" && req.url === "/logout") {
        const { parseCookies } = require("../utils/cookies");
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;
        if (sessionId) {
            delete sessions[sessionId];
        }

        res.setHeader("Set-Cookie", "sessionId=; HttpOnly; Path=/; Max-Age=0");
        res.end(JSON.stringify({ message: "Logged out" }));
        return true;
    }

    return false;
}

module.exports = { handleAuth };
