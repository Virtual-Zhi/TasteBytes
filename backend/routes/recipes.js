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
                const { title, ingredients, instructions } = JSON.parse(body);

                if (!title || !ingredients || !instructions) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "Missing recipe fields" }));
                }

                const recipe = {
                    title,
                    ingredients,
                    instructions,
                    authorId: session.id,
                    createdAt: new Date(),
                };

                await db.collection("recipes").insertOne(recipe);
                await db.collection("users").updateOne(
                    { _id: new ObjectId(session.id) },
                    { $push: { posts: recipe } }
                );

                res.end(JSON.stringify({ message: "Recipe posted successfully!", recipe }));
            } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ message: "Error posting recipe", error: err.message }));
            }
        });
        return true;
    }

    if (req.method === "GET" && req.url === "/recipes") {
        try {
            const recipes = await db.collection("recipes").find().toArray();
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
