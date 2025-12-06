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

    if (req.method === "GET" && req.url === "/recipes") {
        try {
            // fetch recipes (include imageUrl by default)
            const recipes = await db.collection("recipes").find().toArray();

            const ownerIds = recipes
                .map(r => r.ownerId)
                .filter(Boolean)
                .map(id => new ObjectId(id));

            const owners = ownerIds.length
                ? await db.collection("users")
                    .find({ _id: { $in: ownerIds } }, { projection: { username: 1 } })
                    .toArray()
                : [];

            const ownerMap = {};
            owners.forEach(u => { ownerMap[u._id.toString()] = u.username; });

            recipes.forEach(r => {
                r.ownerName = ownerMap[r.ownerId?.toString()] || "Unknown";
                r.imageUrl = r.imageUrl || null;
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: "All recipes", recipes }));
        } catch (err) {
            console.error('Error in GET /recipes:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ message: "Error fetching recipes", error: err.message }));
        }
        return true;
    }

    return false;
}

module.exports = { handleRecipes };
