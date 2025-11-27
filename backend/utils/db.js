 const { MongoClient } = require("mongodb");

const url = "mongodb+srv://BabyCarrotsDB:RuLu9duhvIiTSUPG@finalproj.l6ftjqt.mongodb.net/?appName=FinalProj";
const client = new MongoClient(url);
let db;

async function connectDB() {
    await client.connect();
    db = client.db("RecipeApp");
    console.log("MongoDB connected");
}

function getDB() {
    return db;
}

module.exports = { connectDB, getDB };
