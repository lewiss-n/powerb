// Local and Docker entry point. On Vercel, api/index.js loads the same app instead.
const app = require("./app");
const PORT = +process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nairobi Powerbikes running on http://localhost:${PORT}  (admin: /admin)`));
