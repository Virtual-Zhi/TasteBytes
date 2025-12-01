const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");
const { parseCookies } = require("../utils/cookies");

async function handleProfile(req, res, sessions) {
    if (req.method === "GET" && req.url === "/profile") {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;
        const session = sessions[sessionId];

        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        try {
            const db = getDB();
            const user = await db.collection("users").findOne({ _id: new ObjectId(session.id) });
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


            res.end(JSON.stringify({ message: "Profile data", user: profileData }));
        } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ message: "Error fetching profile", error: err.message }));
        }
        return true;
    }
    return false;
}

module.exports = { handleProfile };
