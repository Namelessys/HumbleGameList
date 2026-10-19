const container = document.getElementById("games");

async function loadGameList() {
	const response = await fetch("/games.txt");

	if (!response.ok) {
		throw new Error("Failed to load games.txt");
	}

	const text = await response.text();

	return text
		.split("\n")
		.map(line => line.trim())
		.filter(line => line.length > 0);
}

// Accepts a game name, a Steam store URL (e.g. https://store.steampowered.com/app/1091500/Cyberpunk_2077/)
// or a raw app ID (e.g. "1091500"), and normalizes it into either a search or a direct lookup.
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

async function searchSteam(input) {
	const parsed = parseSteamInput(input);
	const params = new URLSearchParams();
	
	console.log("TTTTTTTTTTT");
	console.log(parsed.value);

	if (parsed.type === "appid") {
		params.set("appid", parsed.appid);
	} else {
		params.set("name", parsed.name);
	}

	const response = await fetch(`/api/search-steam?${params}`);

	if (!response.ok) {
		throw new Error("Steam search failed");
	}

	return await response.json();
}


/* ---------- render helpers ---------- */

function renderHeader(text) {
	const h = document.createElement("h2");
	h.textContent = text.replace(/^#\s*/, "");
	container.appendChild(h);
}

function renderSmallText(text) {
	const div = document.createElement("div");
	div.textContent = text.replace(/^-+\s*/, "");
	div.style.fontSize = "0.95rem";
	div.style.opacity = "0.8";
	div.style.margin = "6px 0";
	container.appendChild(div);
}

function renderGameTitle(text) {
	const div = document.createElement("div");
	div.textContent = text;
	div.style.fontWeight = "bold";
	div.style.margin = "10px 0 5px 0";
	container.appendChild(div);
}

function renderGameWidget(appid) {
	const iframe = document.createElement("iframe");
	iframe.src = `https://store.steampowered.com/widget/${appid}/`;
	iframe.width = "646";
	iframe.height = "190";
	iframe.frameBorder = "0";

	container.appendChild(iframe);
}

/* ---------- main loader ---------- */

async function loadGames() {
	const lines = await loadGameList();

	for (const line of lines) {

		// comment line
		if (line.startsWith("//")) {
			continue;
		}

		// header
		if (line.startsWith("#")) {
			renderHeader(line);
			continue;
		}

		// small label
		if (line.startsWith("-")) {
			renderSmallText(line);
			continue;
		}

		// steam game
		try {
			const results = await searchSteam(line);

			if (!results.length) {
				console.warn(`No result for ${line}`);
				continue;
			}

			const game = results[0];

			renderGameTitle(game.appName);
			renderGameWidget(game.appid);
		}
		catch (err) {
			console.error(`Failed to load ${line}`, err);
		}
	}
}

loadGames();