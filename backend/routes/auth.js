const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");
const { OAuth2Client } = require("google-auth-library");

// For class purposes only (not secure in production)
const client = new OAuth2Client(
    "261255118602-r5igalkpb2q6oe2jo5lp1td3uas6v11r.apps.googleusercontent.com",
    "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"
);

async function handleAuth(req, res) {
    const db = getDB();

    // ---------------- CREATE ACCOUNT ----------------
    if (req.method === "POST" && req.url === "/create_account") {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", async () => {
            try {
                const { newUsername, newEmail, newPassword, newPhone, plan } = JSON.parse(body);

                const existingUser = await db.collection("users").findOne({ username: newUsername });
                if (existingUser) {
                    res.writeHead(400, { "Content-Type": "application/json" });
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

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Account created successfully!" }));
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error creating account", error: err.message }));
            }
        });
        return true;
    }

    // ---------------- LOGIN ----------------
    if (req.method === "POST" && req.url === "/login") {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", async () => {
            try {
                const { email, password } = JSON.parse(body);
                const user = await db.collection("users").findOne({ email });

                if (!user) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "User not found" }));
                }

                if (user.password !== password) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Invalid credentials" }));
                }

                // Use user._id as token
                const token = user._id.toString();

                // Store session in Mongo
                await db.collection("sessions").updateOne(
                    { _id: token },
                    {
                        $set: {
                            userId: user._id,
                            createdAt: new Date(),
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        },
                    },
                    { upsert: true }
                );

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Login successful!", username: user.username, token }));
            } catch (err) {
                console.error("Login error:", err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Server error", error: err.message }));
            }
        });
        return true;
    }

    // ---------------- GOOGLE LOGIN ----------------
    if (req.method === "POST" && req.url === "/google_login") {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", async () => {
            try {
                const { code } = JSON.parse(body);

                // Exchange code for tokens
                const { tokens } = await client.getToken({
                    code,
                    redirect_uri: "https://tastebytes-6498b743cd23.herokuapp.com/google_login/callback"
                });

                // Verify ID token
                const ticket = await client.verifyIdToken({
                    idToken: tokens.id_token,
                    audience: "261255118602-r5igalkpb2q6oe2jo5lp1td3uas6v11r.apps.googleusercontent.com",
                });

                const payload = ticket.getPayload();
                const email = payload.email;
                const name = payload.name;

                // Check if user exists
                let user = await db.collection("users").findOne({ email });
                if (!user) {
                    const result = await db.collection("users").insertOne({
                        username: name,
                        email,
                        phone: null,
                        plan: "Free",
                        password: null,
                        posts: [],
                        savedRecipes: [],
                        createdAt: new Date(),
                        lastLogin: new Date(),
                    });
                    user = await db.collection("users").findOne({ _id: result.insertedId });
                }

                // Use user._id as token
                const token = user._id.toString();

                // Store session in Mongo
                await db.collection("sessions").updateOne(
                    { _id: token },
                    {
                        $set: {
                            userId: user._id,
                            createdAt: new Date(),
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        },
                    },
                    { upsert: true }
                );

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Google login successful!", username: user.username, token }));
            } catch (err) {
                console.error("Google login error:", err);
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Google login failed", error: err.message }));
            }
        });
        return true;
    }



    // ---------------- LOGOUT ----------------
    if (req.method === "POST" && req.url === "/logout") {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            await db.collection("sessions").deleteOne({ _id: token });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Logged out" }));
        return true;
    }

    return false;
}

module.exports = { handleAuth };
