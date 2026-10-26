// Vercel serverless entry point. vercel.json sends /api/*, /uploads/*, missing /img/* and /favicon.svg here;
// every other file in public/ is served straight from Vercel's CDN.
module.exports = require("../server/app");
