const { ObjectId } = require("mongodb");
const { getDB } = require("../utils/db");
const { parseCookies } = require("../utils/cookies");
const formidable = require("formidable");
const fs = require("fs");

const IMGBB_KEY = "58098efae051b42389b204fe4a5f7561";

// helper: coerce field to a safe string
function fieldToString(f) {
    if (f === undefined || f === null) return "";
    if (Array.isArray(f)) return String(f[0] || "");
    if (typeof f === "object") return JSON.stringify(f);
    return String(f);
}

async function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function handleRecipes(req, res, sessions) {
    const db = getDB();

    if (req.method === "POST" && req.url === "/post_recipe") {
        const cookies = parseCookies(req.headers.cookie || "");
        const sessionId = cookies.sessionId;
        const session = sessions[sessionId];
        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        const form = new formidable.IncomingForm();
        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ message: "Invalid form data" }));
            }

            // DEBUG: log incoming fields/files shape (remove or lower verbosity in production)
            console.log('POST /post_recipe fields:', fields);
            console.log('POST /post_recipe files:', Object.keys(files || {}));

            try {
                // safely coerce fields to strings before trimming/parsing
                const title = fieldToString(fields.title).trim();
                const type = fieldToString(fields.type).trim();
                const prepTimeRaw = fieldToString(fields.prepTime).trim();
                const prepTime = prepTimeRaw === "" ? "" : prepTimeRaw;
                const instructions = fieldToString(fields.instructions).trim();
                const tips = fieldToString(fields.tips);

                // parse ingredients: expect a JSON string from client, but handle other shapes
                let ingredients = [];
                if (fields.ingredients) {
                    const ingStr = fieldToString(fields.ingredients);
                    try {
                        const parsed = JSON.parse(ingStr);
                        if (Array.isArray(parsed)) ingredients = parsed;
                        else if (typeof parsed === "string") ingredients = parsed.split(',').map(s => s.trim()).filter(Boolean);
                        else ingredients = [];
                    } catch {
                        // fallback: split by newline or comma
                        ingredients = ingStr.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
                    }
                }

                // validate required fields
                if (!title || !ingredients.length || !instructions) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "Missing recipe fields" }));
                }

                // require uploaded file under 'image'
                if (!files || !files.image) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ message: "Image is required" }));
                }

                // upload image to ImgBB
                let imageUrl = fields.imageUrl || null;

                if (!imageUrl) {
                    if (!files || !files.image) {
                        res.statusCode = 400;
                        return res.end(JSON.stringify({ message: "Image is required" }));
                    }

                    const fileEntry = Array.isArray(files.image) ? files.image[0] : files.image;

                    // Try common path properties
                    const imgPath = fileEntry?.filepath || fileEntry?.path || fileEntry?.filePath || fileEntry?.tempFilePath
                        || fileEntry?._writeStream?.path || null;

                    console.log('Uploaded file object:', fileEntry);
                    console.log('Resolved temp path:', imgPath);

                    // If formidable provided an in-memory buffer (some configs), use it
                    let base64;
                    try {
                        if (fileEntry && fileEntry.buffer && fileEntry.buffer.length) {
                            base64 = fileEntry.buffer.toString('base64');
                            console.log('Using in-memory buffer for upload, size:', fileEntry.buffer.length);
                        } else if (imgPath) {
                            // ensure file exists and non-empty
                            if (!fs.existsSync(imgPath)) {
                                res.statusCode = 400;
                                return res.end(JSON.stringify({ message: "Temporary upload file not found on server" }));
                            }
                            const stat = fs.statSync(imgPath);
                            if (!stat || stat.size === 0) {
                                try { fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
                                res.statusCode = 400;
                                return res.end(JSON.stringify({ message: "Uploaded file is empty" }));
                            }
                            base64 = fs.readFileSync(imgPath, { encoding: 'base64' });
                            console.log('Read temp file size:', stat.size);
                        } else {
                            // nothing usable found
                            res.statusCode = 400;
                            return res.end(JSON.stringify({ message: "Uploaded file has no readable source" }));
                        }

                        if (!base64 || base64.length === 0) {
                            throw new Error('Empty upload source');
                        }

                        // upload to ImgBB
                        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                            method: "POST",
                            body: new URLSearchParams({ image: base64 })
                        });
                        
                        const imgbbJson = await imgbbRes.json();
                        console.log('ImgBB response', imgbbRes.status, imgbbJson);


                        if (!imgbbRes.ok || !imgbbJson.data?.url) {
                            throw new Error(imgbbJson.error?.message || "ImgBB upload failed");
                        }
                        imageUrl = imgbbJson.data.url;
                    } finally {
                        // try to remove temp file if we used one
                        try { if (imgPath && fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
                    }
                }


                const recipe = {
                    title,
                    type,
                    prepTime,
                    ingredients,
                    instructions,
                    tips,
                    imageUrl,
                    rating: { average: 0, count: 0 },
                    userRatings: {}, // NEW: map of userId → rating
                    ownerId: session.id,
                    createdAt: new Date()
                };


                const insertResult = await db.collection("recipes").insertOne(recipe);
                recipe._id = insertResult.insertedId;

                await db.collection("users").updateOne(
                    { _id: new ObjectId(session.id) },
                    { $push: { posts: recipe._id } }
                );

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: "Recipe posted successfully!", recipe }));
            } catch (e) {
                console.error('Error in /post_recipe:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ message: "Error posting recipe", error: e.message }));
            }
        });

        return true;
    }

    if (req.method === "POST" && req.url === "/save_recipe") {
        const cookies = parseCookies(req.headers.cookie || "");
        const session = sessions[cookies.sessionId];
        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { recipeId } = JSON.parse(body);
                await db.collection("users").updateOne(
                    { _id: new ObjectId(session.id) },
                    { $addToSet: { savedRecipes: new ObjectId(recipeId) } }
                );
                res.end(JSON.stringify({ message: "Recipe saved!" }));
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: "Bad request", error: e.message }));
            }
        });
        return true;
    }

    if (req.method === "POST" && req.url === "/remove_recipe") {
        const cookies = parseCookies(req.headers.cookie || "");
        const session = sessions[cookies.sessionId];
        if (!session) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ message: "Not logged in" }));
        }

        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { recipeId } = JSON.parse(body);
                await db.collection("users").updateOne(
                    { _id: new ObjectId(session.id) },
                    { $pull: { savedRecipes: new ObjectId(recipeId) } }
                );
                res.end(JSON.stringify({ message: "Recipe removed!" }));
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: "Bad request", error: e.message }));
            }
        });
        return true;
    }

    if (req.method === "GET" && req.url.startsWith("/recipes")) {
        try {
            const parts = req.url.split("/").filter(Boolean);

            // Case 1: GET /recipes → return all recipes
            if (parts.length === 1) {
                const recipes = await db.collection("recipes").find().toArray();

                // collect ownerIds safely
                const ownerIds = recipes
                    .map(r => r.ownerId)
                    .filter(id => id && ObjectId.isValid(id))
                    .map(id => new ObjectId(id));

                const owners = ownerIds.length
                    ? await db.collection("users")
                        .find({ _id: { $in: ownerIds } }, { projection: { username: 1 } })
                        .toArray()
                    : [];

                const ownerMap = {};
                owners.forEach(u => { ownerMap[u._id.toString()] = u.username; });

                // normalize and attach owner names
                recipes.forEach(r => {
                    r._id = r._id.toString();
                    if (r.ownerId && ObjectId.isValid(r.ownerId)) {
                        r.ownerId = r.ownerId.toString();
                    }
                    r.ownerName = ownerMap[r.ownerId] || "Unknown";
                    r.imageUrl = r.imageUrl || null;
                });

                // optionally attach current user's rating for each recipe
                const cookies = parseCookies(req.headers.cookie);
                const sessionId = cookies.sessionId;
                const session = sessions[sessionId];
                if (session) {
                    const userId = session.id;
                    recipes.forEach(r => {
                        r.userRating = r.userRatings?.[userId] || null;
                    });
                }

                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ message: "All recipes", recipes }));
                return true;
            }

            // Case 2: GET /recipes/:id → return one recipe
            if (parts.length === 2) {
                const recipeId = parts[1];
                if (!ObjectId.isValid(recipeId)) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ message: "Invalid recipe ID" }));
                    return true;
                }

                const recipe = await db.collection("recipes").findOne({ _id: new ObjectId(recipeId) });
                if (!recipe) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ message: "Recipe not found" }));
                    return true;
                }

                if (recipe.ownerId && ObjectId.isValid(recipe.ownerId)) {
                    const owner = await db.collection("users").findOne(
                        { _id: new ObjectId(recipe.ownerId) },
                        { projection: { username: 1 } }
                    );
                    recipe.ownerName = owner?.username || "Unknown";
                }

                recipe._id = recipe._id.toString();
                recipe.imageUrl = recipe.imageUrl || null;

                // attach current user's rating
                const cookies = parseCookies(req.headers.cookie);
                const sessionId = cookies.sessionId;
                const session = sessions[sessionId];
                if (session) {
                    const userId = session.id;
                    recipe.userRating = recipe.userRatings?.[userId] || null;
                }

                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ message: "Recipe found", recipe }));
                return true;
            }
        } catch (err) {
            console.error("Error in GET /recipes:", err);
            res.statusCode = 500;
            res.end(JSON.stringify({ message: "Error fetching recipes", error: err.message }));
            return true;
        }
    }


    // POST /recipes/:id/rate
    if (req.method === "POST" && req.url.startsWith("/recipes/") && req.url.endsWith("/rate")) {
        try {
            const recipeId = req.url.split("/")[2];
            const { rating } = await getRequestBody(req);

            if (!rating || rating < 1 || rating > 5) {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: "Invalid rating value" }));
                return true;
            }

            const cookies = parseCookies(req.headers.cookie);
            const sessionId = cookies.sessionId;
            const session = sessions[sessionId];

            if (!session) {
                res.statusCode = 401;
                res.end(JSON.stringify({ message: "Login required to rate" }));
                return true;
            }

            const userId = session.id;

            const recipe = await db.collection("recipes").findOne({ _id: new ObjectId(recipeId) });
            if (!recipe) {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: "Recipe not found" }));
                return true;
            }

            // Ratings map: { userId: rating }
            const existingRatings = recipe.userRatings || {};
            const hadPrevious = existingRatings[userId] !== undefined;
            const oldRating = existingRatings[userId];

            // Update this user's rating
            existingRatings[userId] = rating;

            // Recalculate average/count
            const allRatings = Object.values(existingRatings);
            const newCount = allRatings.length;
            const newAverage = allRatings.reduce((sum, r) => sum + r, 0) / newCount;

            const updatedRating = { average: newAverage, count: newCount };

            await db.collection("recipes").updateOne(
                { _id: new ObjectId(recipeId) },
                { $set: { rating: updatedRating, userRatings: existingRatings } }
            );

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
                message: hadPrevious ? "Rating updated" : "Rating saved",
                rating: updatedRating,
                userRating: rating
            }));
        } catch (err) {
            console.error("Error in POST /recipes/:id/rate:", err);
            res.statusCode = 500;
            res.end(JSON.stringify({ message: "Error saving rating", error: err.message }));
        }
        return true;
    }





    return false;
}

module.exports = { handleRecipes };
