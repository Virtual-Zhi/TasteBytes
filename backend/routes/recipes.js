const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");
const formidable = require("formidable");
const fs = require("fs");

const IMGBB_KEY = "58098efae051b42389b204fe4a5f7561";

async function getBody(req) {
    return new Promise((resolve) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                resolve({});
            }
        });
    });
}

async function getSession(req, db) {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) return null;
    const token = h.split(" ")[1];
    return await db.collection("sessions").findOne({ _id: token });
}

async function handleRecipes(req, res) {
    const db = getDB();
    
    if (req.method === "POST" && req.url === "/post_recipe") {
        const session = await getSession(req, db);
        res.setHeader("Content-Type", "application/json");

        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        const user = await db.collection("users").findOne({ _id: session.userId });
        if (!user) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ message: "User not found" }));
        }

        if (user.plan === "Free" && (user.posts || []).length >= 3) {
            res.statusCode = 403;
            return res.end(JSON.stringify({ message: "Free users can only post 3 recipes" }));
        }

        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ message: "Invalid form" }));
            }

            const title = String(fields.title || "").trim();
            const type = String(fields.type || "").trim();
            const instructions = String(fields.instructions || "").trim();
            let ingredients = [];

            try {
                ingredients = JSON.parse(fields.ingredients || "[]");
                if (!Array.isArray(ingredients)) ingredients = [];
            } catch {
                ingredients = [];
            }

            if (!title || !instructions || ingredients.length === 0) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ message: "Missing fields" }));
            }

            // Optional: upload image to imgbb if file provided
            let imageUrl = fields.imageUrl || null;
            try {
                const file = Array.isArray(files.image) ? files.image?.[0] : files.image;
                if (!imageUrl && file) {
                    const imgPath = file.filepath || file.path;
                    const base64 = fs.readFileSync(imgPath, "base64");
                    const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                        method: "POST",
                        body: new URLSearchParams({ image: base64 }),
                    });
                    const j = await r.json();
                    imageUrl = j?.data?.url || null;
                }
            } catch {
                // If upload fails, keep imageUrl as null (do not crash)
                imageUrl = imageUrl || null;
            }

            const recipeDoc = {
                title,
                type,
                instructions,
                ingredients,
                imageUrl,
                prepTime: Number(fields.prepTime) || 0,
                rating: { average: 0, count: 0 },
                userRatings: {},
                ownerId: session.userId,
                createdAt: new Date(),
            };

            const result = await db.collection("recipes").insertOne(recipeDoc);
            const insertedRecipe = { ...recipeDoc, _id: result.insertedId };

            // push to user's posts
            await db.collection("users").updateOne(
                { _id: session.userId },
                { $push: { posts: insertedRecipe._id } }
            );

            // Normalize return types for frontend
            insertedRecipe._id = insertedRecipe._id.toString();
            insertedRecipe.ownerId = insertedRecipe.ownerId.toString();

            res.statusCode = 201;
            return res.end(JSON.stringify({ message: "Recipe posted", recipe: insertedRecipe }));
        });

        return true;
    }

    if (req.method === "GET" && req.url.startsWith("/recipes")) {
        const parts = req.url.split("/").filter(Boolean);
        res.setHeader("Content-Type", "application/json");

        if (parts.length === 1) {
            const recipes = await db.collection("recipes").find().toArray();

            const ownerIds = recipes
                .map((r) => r.ownerId)
                .filter((id) => id && ObjectId.isValid(id))
                .map((id) => new ObjectId(id));

            const owners =
                ownerIds.length > 0
                    ? await db
                        .collection("users")
                        .find({ _id: { $in: ownerIds } }, { projection: { username: 1 } })
                        .toArray()
                    : [];

            const ownerMap = {};
            owners.forEach((u) => {
                ownerMap[u._id.toString()] = u.username;
            });

            recipes.forEach((r) => {
                r._id = r._id.toString();
                if (r.ownerId && ObjectId.isValid(r.ownerId)) {
                    r.ownerId = r.ownerId.toString();
                    r.ownerName = ownerMap[r.ownerId] || "Unknown";
                } else {
                    r.ownerName = "Unknown";
                }
            });

            return res.end(JSON.stringify({ recipes }));
        }

        // Single recipe
        if (parts.length === 2) {
            const id = parts[1];
            if (!ObjectId.isValid(id)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ message: "Invalid recipe ID" }));
            }

            const recipe = await db.collection("recipes").findOne({ _id: new ObjectId(id) });
            if (!recipe) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ message: "Not found" }));
            }

            recipe._id = recipe._id.toString();

            // attach ownerName
            if (recipe.ownerId && ObjectId.isValid(recipe.ownerId)) {
                const owner = await db.collection("users").findOne(
                    { _id: new ObjectId(recipe.ownerId) },
                    { projection: { username: 1 } }
                );
                recipe.ownerId = recipe.ownerId.toString();
                recipe.ownerName = owner?.username || "Unknown";
            }

            // attach userRating if logged in
            const session = await getSession(req, db);
            let userRating = null;
            if (session) {
                userRating = recipe.userRatings?.[session.userId] || null;
            }

            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ recipe, userRating }));
        }

    }

    if (req.method === "POST" && req.url.startsWith("/recipes/") && req.url.endsWith("/rate")) {
        res.setHeader("Content-Type", "application/json");
        const session = await getSession(req, db);
        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Login required" }));
        }

        const parts = req.url.split("/").filter(Boolean); // ["recipes", ":id", "rate"]
        const id = parts[1];

        if (!ObjectId.isValid(id)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ message: "Invalid recipe ID" }));
        }

        const { rating } = await getBody(req);
        const parsed = Number(rating);
        if (!parsed || parsed < 1 || parsed > 5) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ message: "Invalid rating" }));
        }

        const recipe = await db.collection("recipes").findOne({ _id: new ObjectId(id) });
        if (!recipe) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ message: "Recipe not found" }));
        }

        recipe.userRatings = recipe.userRatings || {};
        recipe.userRatings[session.userId] = parsed;

        const ratings = Object.values(recipe.userRatings);
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        const updatedRating = { average: avg, count: ratings.length };

        await db.collection("recipes").updateOne(
            { _id: new ObjectId(id) },
            { $set: { rating: updatedRating, userRatings: recipe.userRatings } }
        );

        res.statusCode = 200;
        return res.end(JSON.stringify({ message: "Rating saved", rating: updatedRating, userRating: parsed }));
    }

    // ---------------- POST /save_recipe ----------------
    if (req.method === "POST" && req.url === "/save_recipe") {
        res.setHeader("Content-Type", "application/json");
        const session = await getSession(req, db);
        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        const { recipeId } = await getBody(req);
        if (!recipeId || !ObjectId.isValid(recipeId)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ message: "Invalid recipe ID" }));
        }

        await db.collection("users").updateOne(
            { _id: session.userId },
            { $addToSet: { savedRecipes: new ObjectId(recipeId) } }
        );

        res.statusCode = 200;
        return res.end(JSON.stringify({ message: "Recipe saved" }));
    }

    // ---------------- POST /remove_recipe ----------------
    if (req.method === "POST" && req.url === "/remove_recipe") {
        res.setHeader("Content-Type", "application/json");
        const session = await getSession(req, db);
        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        const { recipeId } = await getBody(req);
        if (!recipeId || !ObjectId.isValid(recipeId)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ message: "Invalid recipe ID" }));
        }

        await db.collection("users").updateOne(
            { _id: session.userId },
            { $pull: { savedRecipes: new ObjectId(recipeId) } }
        );

        res.statusCode = 200;
        return res.end(JSON.stringify({ message: "Recipe removed" }));
    }

    return false;
}

module.exports = { handleRecipes };
