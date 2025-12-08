const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");
const { parseCookies } = require("../utils/cookies");

async function handleProfile(req, res) {
    if (req.method === "GET" && req.url === "/profile") {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;

        console.log("Cookie header:", req.headers.cookie);

        if (!sessionId) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        const db = getDB();
        const session = await db.collection("sessions").findOne({ _id: sessionId });

        if (!session || new Date() > session.expiresAt) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Session expired or invalid" }));
        }

        const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
        if (!user) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ message: "User not found" }));
        }

        const profileData = {
            username: user.username,
            email: user.email,
            phone: user.phone || "Not provided",
            plan: user.plan || "Free",
            savedRecipes: (user.savedRecipes || []).map(id => id.toString()),
            posts: user.posts,
        };

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ message: "Profile data", user: profileData }));
        return true;
    }
    return false;
}


module.exports = { handleProfile };
