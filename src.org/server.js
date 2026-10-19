const express = require("express");
const path = require("path");

const app = express();
const PORT = 53789;

app.use(express.static(path.join(__dirname, "public")));
// Shared with the client (or put in its own module and import it on both sides).
// Accepts a game name, a Steam store/community URL, or a raw app ID.
function parseSteamInput(input) {
	const value = String(input).trim();

	if (/^\d+$/.test(value)) {
		return { type: "appid", appid: value };
	}

	const urlMatch = value.match(/(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i);
	if (urlMatch) {
		return { type: "appid", appid: urlMatch[1] };
	}

	const protoMatch = value.match(/^steam:\/\/\w+\/(\d+)/i);
	if (protoMatch) {
		return { type: "appid", appid: protoMatch[1] };
	}

	return { type: "name", name: value };
}

app.get("/api/search-steam", async (req, res) => {
	try {
		const parsed = parseSteamInput(req.query.appid ?? req.query.name);

		if (parsed.type === "name" && !parsed.name) {
			return res.status(400).json({
				error: "Missing game name"
			});
		}

		// App ID given directly: fetch the game from the store API
		if (parsed.type === "appid") {
			const response = await fetch(
				`https://store.steampowered.com/api/appdetails?appids=${parsed.appid}&filters=basic`
			);

			if (!response.ok) {
				throw new Error(`Steam returned ${response.status}`);
			}

			const data = await response.json();
			const game = data[parsed.appid];

			// Steam returns success: false for appids that don't exist
			if (!game?.success) {
				return res.status(404).json({
					error: `No Steam game found for appid ${parsed.appid}`
				});
			}

			// Shape it like the search results: { appid, name, icon }
			return res.json([{
				appid: Number(parsed.appid),
				name: game.data.name,
				icon: game.data.header_image
			}]);
		}

		// Name search (original behaviour)
		const response = await fetch(
			`https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(parsed.name)}`
		);

		if (!response.ok) {
			throw new Error(`Steam returned ${response.status}`);
		}

		const results = await response.json();

		res.json(results);
	}
	catch (err) {
		console.error(err);

		res.status(500).json({
			error: "Failed to search Steam"
		});
	}
});


app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});