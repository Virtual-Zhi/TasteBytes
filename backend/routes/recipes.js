const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");
const formidable = require("formidable");
const fs = require("fs");

const IMGBB_KEY = "58098efae051b42389b204fe4a5f7561";

async function getBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", c => body += c);
        req.on("end", () => {
            try { resolve(JSON.parse(body || "{}")); }
            catch (e) { reject(e); }
        });
    });
}

async function getSession(req, db) {
    const h = req.headers.authorization;
    if (!h) return null;
    const token = h.split(" ")[1];
    return await db.collection("sessions").findOne({ _id: token });
}

async function handleRecipes(req, res) {
    const db = getDB();

    // POST /post_recipe
    if (req.method === "POST" && req.url === "/post_recipe") {
        const session = await getSession(req, db);
        if (!session) return res.end(JSON.stringify({ message: "Not logged in" }));

        const user = await db.collection("users").findOne({ _id: session.userId });
        if (user.plan === "Free" && (user.posts || []).length >= 3)
            return res.end(JSON.stringify({ message: "Free users can only post 3 recipes" }));

        const form = new formidable.IncomingForm();
        form.parse(req, async (err, fields, files) => {
            if (err) return res.end(JSON.stringify({ message: "Invalid form" }));

            const title = (fields.title || "").trim();
            const instructions = (fields.instructions || "").trim();
            const ingredients = JSON.parse(fields.ingredients || "[]");
            if (!title || !instructions || !ingredients.length)
                return res.end(JSON.stringify({ message: "Missing fields" }));

            let imageUrl = fields.imageUrl || null;
            if (!imageUrl && files.image) {
                const file = Array.isArray(files.image) ? files.image[0] : files.image;
                const imgPath = file.filepath || file.path;
                const base64 = fs.readFileSync(imgPath, "base64");
                const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                    method: "POST", body: new URLSearchParams({ image: base64 })
                });
                const j = await r.json();
                imageUrl = j.data?.url;
            }

            const recipe = {
                title, instructions, ingredients, imageUrl,
                rating: { average: 0, count: 0 },
                userRatings: {}, ownerId: session.userId, createdAt: new Date()
            };
            const result = await db.collection("recipes").insertOne(recipe);
            recipe._id = result.insertedId;
            await db.collection("users").updateOne({ _id: session.userId }, { $push: { posts: recipe._id } });
            res.end(JSON.stringify({ message: "Recipe posted", recipe }));
        });
        return true;
    }

    // POST /save_recipe
    if (req.method === "POST" && req.url === "/save_recipe") {
        const session = await getSession(req, db);
        if (!session) return res.end(JSON.stringify({ message: "Not logged in" }));
        const { recipeId } = await getBody(req);
        await db.collection("users").updateOne(
            { _id: session.userId },
            { $addToSet: { savedRecipes: new ObjectId(recipeId) } }
        );
        return res.end(JSON.stringify({ message: "Recipe saved" }));
    }

    // POST /remove_recipe
    if (req.method === "POST" && req.url === "/remove_recipe") {
        const session = await getSession(req, db);
        if (!session) return res.end(JSON.stringify({ message: "Not logged in" }));
        const { recipeId } = await getBody(req);
        await db.collection("users").updateOne(
            { _id: session.userId },
            { $pull: { savedRecipes: new ObjectId(recipeId) } }
        );
        return res.end(JSON.stringify({ message: "Recipe removed" }));
    }

    // GET /recipes or /recipes/:id
    if (req.method === "GET" && req.url.startsWith("/recipes")) {
        const parts = req.url.split("/").filter(Boolean);
        if (parts.length === 1) {
            const recipes = await db.collection("recipes").find().toArray();
            recipes.forEach(r => r._id = r._id.toString());
            return res.end(JSON.stringify({ recipes }));
        }
        if (parts.length === 2) {
            const id = parts[1];
            const recipe = await db.collection("recipes").findOne({ _id: new ObjectId(id) });
            if (!recipe) return res.end(JSON.stringify({ message: "Not found" }));
            recipe._id = recipe._id.toString();
            return res.end(JSON.stringify({ recipe }));
        }
    }

    // POST /recipes/:id/rate
    if (req.method === "POST" && req.url.startsWith("/recipes/") && req.url.endsWith("/rate")) {
        const session = await getSession(req, db);
        if (!session) return res.end(JSON.stringify({ message: "Login required" }));
        const id = req.url.split("/")[2];
        const { rating } = await getBody(req);
        if (!rating || rating < 1 || rating > 5)
            return res.end(JSON.stringify({ message: "Invalid rating" }));

        const recipe = await db.collection("recipes").findOne({ _id: new ObjectId(id) });
        if (!recipe) return res.end(JSON.stringify({ message: "Recipe not found" }));

        recipe.userRatings = recipe.userRatings || {};
        recipe.userRatings[session.userId] = rating;
        const ratings = Object.values(recipe.userRatings);
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        const updated = { average: avg, count: ratings.length };

        await db.collection("recipes").updateOne(
            { _id: new ObjectId(id) },
            { $set: { rating: updated, userRatings: recipe.userRatings } }
        );
        return res.end(JSON.stringify({ message: "Rating saved", rating: updated, userRating: rating }));
    }

    return false;
}

module.exports = { handleRecipes };
