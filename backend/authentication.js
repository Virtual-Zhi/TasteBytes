const { compare } = require("bcryptjs");
const http = require("http");
const { MongoClient, ObjectId } = require("mongodb");
// MongoDB connection
const url = "mongodb+srv://BabyCarrotsDB:RuLu9duhvIiTSUPG@finalproj.l6ftjqt.mongodb.net/?appName=FinalProj";
const client = new MongoClient(url);
let db;

// In-memory session store
const sessions = {};

async function connectDB() {
    await client.connect();
    db = client.db("RecipeApp");
    console.log("MongoDB connected");
}

connectDB();

// Helper: parse cookies
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(";").forEach(cookie => {
        const [name, value] = cookie.trim().split("=");
        cookies[name] = value;
    });
    return cookies;
}

const server = http.createServer(async (req, res) => {
    // Basic CORS headers
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5500");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    // Create account
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

        // Login
    } else if (req.method === "POST" && req.url === "/login") {
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

                const isMatch = compare(password, user.password);
                if (!isMatch) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "Invalid credentials" }));
                }

                const sessionId = user._id.toString();
                sessions[sessionId] = { id: user._id.toString(), username: user.username };

                res.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly; Path=/`);
                res.end(JSON.stringify({ message: "Login successful!", username: user.username }));
            } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ message: "Server error", error: err.message }));
            }
        });

        // Profile
    } else if (req.method === "GET" && req.url === "/profile") {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;
        const session = sessions[sessionId];

        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        try {
            const user = await db.collection("users").findOne({ _id: new ObjectId(session.id) });
            if (!user) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ message: "User not found" }));
            }

            // Return selected profile data
            const profileData = {
                username: user.username,
                email: user.email,
                phone: user.phone || "Not provided",
                plan: user.plan || "Free",
                savedRecipes: user.savedRecipes,
                posts: user.posts,
            };

            res.end(JSON.stringify({ message: "Profile data", user: profileData }));
        } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ message: "Error fetching profile", error: err.message }));
        }

        // Logout
    } else if (req.method === "POST" && req.url === "/logout") {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;
        if (sessionId) {
            delete sessions[sessionId];
        }

        res.setHeader("Set-Cookie", "sessionId=; HttpOnly; Path=/; Max-Age=0");
        res.end(JSON.stringify({ message: "Logged out" }));

        // Fallback
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ message: "Not found" }));
    }
});

server.listen(8080, () => console.log("Server running on http://localhost:8080"));
