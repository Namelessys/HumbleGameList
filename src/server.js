const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 53789;

app.use(express.static(path.join(__dirname, "public")));

const GAMES_FILE = path.join(__dirname, "games.txt");

/* ---------- steam input parsing ---------- */

// Accepts a game name, a Steam store/community URL,
// or a raw app ID, and normalizes it.
function parseSteamInput(input) {
	const value = String(input).trim();

	// Pure numeric ID
	if (/^\d+$/.test(value)) {
		return { type: "appid", appid: value };
	}

	// Steam store / community URLs containing an app id
	const urlMatch = value.match(/(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i);
	if (urlMatch) {
		return { type: "appid", appid: urlMatch[1] };
	}

	// Also tolerate "steam://store/1091500" style links
	const protoMatch = value.match(/^steam:\/\/\w+\/(\d+)/i);
	if (protoMatch) {
		return { type: "appid", appid: protoMatch[1] };
	}

	return { type: "name", name: value };
}

/* ---------- steam fetch helpers ---------- */

async function fetchSteamGame(appid) {
	const response = await fetch(
		`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic`
	);

	if (!response.ok) {
		throw new Error(`Steam returned ${response.status}`);
	}

	const data = await response.json();
	const game = data[appid];

	// Steam returns success: false for appids that don't exist
	if (!game?.success) {
		return null;
	}

	return {
		appid: Number(appid),
		appName: game.data.name,
		icon: game.data.header_image
	};
}

async function fetchSteamSearch(name) {
	const response = await fetch(
		`https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(name)}`
	);

	if (!response.ok) {
		throw new Error(`Steam returned ${response.status}`);
	}

	return response.json();
}

/* ---------- games.txt parsing ---------- */

function parseGamesTxt(text) {
	const items = [];

	for (const rawLine of text.split("\n")) {
		const line = rawLine.trim();

		// blank or comment
		if (!line || line.startsWith("//")) {
			continue;
		}

		if (line.startsWith("###")) {
			items.push({ kind: "header3", text: line.replace(/^###\s*/, "") });
			continue;
		}
		if (line.startsWith("##")) {
			items.push({ kind: "header2", text: line.replace(/^##\s*/, "") });
			continue;
		}
		if (line.startsWith("#")) {
			items.push({ kind: "header1", text: line.replace(/^#\s*/, "") });
			continue;
		}

		if (line.startsWith("-")) {
			items.push({ kind: "label", text: line.replace(/^-+\s*/, "") });
			continue;
		}
		
		if (line.startsWith("!")) {
			items.push({ kind: "deadline", text: line.replace(/^!+\s*/, "") });
			continue;
		}

		items.push({ kind: "game", query: line });
	}

	return items;
}

/* ---------- steam resolution with caching ---------- */

const steamCache = new Map();
const STEAM_CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function resolveGame(query) {
	const cacheKey = `query:${query}`;

	if (steamCache.has(cacheKey)) {
		const cached = steamCache.get(cacheKey);

		if (Date.now() - cached.at < STEAM_CACHE_TTL) {
			return cached.value;
		}
	}

	const parsed = parseSteamInput(query);
	let game;

	if (parsed.type === "appid") {
		game = await fetchSteamGame(parsed.appid);
	} else {
		const results = await fetchSteamSearch(parsed.name);

		game = results.length
			? { appid: results[0].appid, appName: results[0].name }
			: null;
	}

	steamCache.set(cacheKey, { at: Date.now(), value: game });

	return game;
}

/* ---------- endpoint: whole list built server-side ---------- */

app.get("/api/games", async (req, res) => {
	try {
		const text = await fs.readFile(GAMES_FILE, "utf8");
		const items = parseGamesTxt(text);

		// Resolve every game entry against Steam before responding.
		// Games.txt order is preserved; a failed lookup becomes null
		// instead of killing the whole response.
		const resolved = await Promise.all(
			items.map(async item => {
				if (item.kind !== "game") {
					return item;
				}

				try {
					const game = await resolveGame(item.query);
					return { kind: "game", game };
				} catch (err) {
					console.error(`Failed to load ${item.query}`, err);
					return { kind: "game", game: null, query: item.query };
				}
			})
		);

		res.json({ items: resolved });
	} catch (err) {
		console.error(err);

		res.status(500).json({
			error: "Failed to load game list"
		});
	}
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
