const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");
const { parseCookies } = require("../utils/cookies");

async function handleRecipes(req, res, sessions) {
    const db = getDB();

    if (req.method === "POST" && req.url === "/post_recipe") {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;
        const session = sessions[sessionId];

        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const {
                    title,
                    type,
                    prepTime,
                    ingredients,
                    instructions,
                    tips
                } = JSON.parse(body);

                if (!title || !ingredients || !instructions) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "Missing recipe fields" }));
                }

                const recipe = {
                    title,
                    type,
                    prepTime,
                    ingredients,
                    instructions,
                    tips,
                    rating: {
                        average: 0,
                        count: 0
                    },
                    ownerId: session.id,
                    createdAt: new Date()
                };

                const insertResult = await db.collection("recipes").insertOne(recipe);
                recipe._id = insertResult.insertedId;

                await db.collection("users").updateOne(
                    { _id: new ObjectId(session.id) },
                    { $push: { posts: recipe._id } }
                );

                res.end(JSON.stringify({ message: "Recipe posted successfully!", recipe }));
            } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ message: "Error posting recipe", error: err.message }));
            }
        });
        return true;
    }

    if (req.method === "POST" && req.url === "/save_recipe") {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;
        const session = sessions[sessionId];

        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            const { recipeId } = JSON.parse(body);
            const db = getDB();

            await db.collection("users").updateOne(
                { _id: new ObjectId(session.id) },
                { $addToSet: { savedRecipes: new ObjectId(recipeId) } }
            );

            res.end(JSON.stringify({ message: "Recipe saved!" }));
        });
        return true;
    }


    if (req.method === "POST" && req.url === "/remove_recipe") {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies.sessionId;
        const session = sessions[sessionId];

        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            const { recipeId } = JSON.parse(body);
            const db = getDB();

            await db.collection("users").updateOne(
                { _id: new ObjectId(session.id) },
                { $pull: { savedRecipes: new ObjectId(recipeId) } }
            );

            res.end(JSON.stringify({ message: "Recipe removed!" }));
        });
        return true;
    }

    if (req.method === "GET" && req.url === "/recipes") {
        try {
            const recipes = await db.collection("recipes").find().toArray();

            // collect all ownerIds
            const ownerIds = recipes.map(r => new ObjectId(r.ownerId));
            const owners = await db.collection("users")
                .find({ _id: { $in: ownerIds } }, { projection: { username: 1 } })
                .toArray();

            // build lookup map
            const ownerMap = {};
            owners.forEach(u => { ownerMap[u._id.toString()] = u.username; });

            // attach names
            recipes.forEach(r => {
                r.ownerName = ownerMap[r.ownerId?.toString()] || "Unknown";
            });

            res.end(JSON.stringify({ message: "All recipes", recipes }));
        } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ message: "Error fetching recipes", error: err.message }));
        }
        return true;
    }
    
    return false;
}

module.exports = { handleRecipes };
