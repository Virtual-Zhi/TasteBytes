const http = require("http");
const { connectDB } = require("./utils/db");
const { handleAuth } = require("./routes/auth");
const { handleProfile } = require("./routes/profile");
const { handleRecipes } = require("./routes/recipes");

const sessions = {};

connectDB();

const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5500");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    if (await handleAuth(req, res, sessions)) return;
    if (await handleProfile(req, res, sessions)) return;
    if (await handleRecipes(req, res, sessions)) return;

    res.statusCode = 404;
    res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(8080, () => {
    console.log("Server listening on port 8080");
});