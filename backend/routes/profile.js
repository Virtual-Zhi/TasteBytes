const { getDB } = require("../utils/db");

async function handleProfile(req, res) {
    const db = getDB();

    if (req.method === "GET" && req.url === "/profile") {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        // Expect header like: Authorization: Bearer <token>
        const token = authHeader.split(" ")[1];

        // Look up session in Mongo
        const session = await db.collection("sessions").findOne({ _id: token });
        if (!session) {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "Invalid session" }));
        }

        // Get user info
        const user = await db.collection("users").findOne({ _id: session.userId });
        if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "User not found" }));
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ username: user.username, email: user.email, plan: user.plan }));
    }

    return false;
}

module.exports = { handleProfile };
