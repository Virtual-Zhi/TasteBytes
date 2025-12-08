const { getDB } = require("../utils/db");

async function handleProfile(req, res) {
    const db = getDB();

    if (req.method === "GET" && req.url === "/profile") {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.end(JSON.stringify({ message: "Not logged in" }));
        const token = authHeader.split(" ")[1];
        const session = await db.collection("sessions").findOne({ _id: token });
        if (!session) return res.end(JSON.stringify({ message: "Invalid session" }));

        const user = await db.collection("users").findOne({ _id: session.userId });
        if (!user) return res.end(JSON.stringify({ message: "User not found" }));

        const { createdAt, lastLogin, ...safeUser } = user;
        safeUser._id = safeUser._id.toString();
        return res.end(JSON.stringify(safeUser));
    }

    if (req.method === "POST" && req.url === "/get_premium") {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.end(JSON.stringify({ message: "Not logged in" }));
        const token = authHeader.split(" ")[1];
        const session = await db.collection("sessions").findOne({ _id: token });
        if (!session) return res.end(JSON.stringify({ message: "Invalid session" }));

        const user = await db.collection("users").findOne({ _id: session.userId });
        if (!user) return res.end(JSON.stringify({ message: "User not found" }));

        await db.collection("users").updateOne(
            { _id: session.userId },
            { $push: { plan: "Premium" } }
        );

        return
    }

    return false;
}

module.exports = { handleProfile };
