const container = document.getElementById("games");

/* ---------- render helpers ---------- */

function renderHeader1(text) {
	const h = document.createElement("h1");
	h.textContent = text;
	container.appendChild(h);
}
function renderHeader2(text) {
	const h = document.createElement("h2");
	h.textContent = text;
	container.appendChild(h);
}
function renderHeader3(text) {
	const h = document.createElement("h3");
	h.textContent = text;
	container.appendChild(h);
}

function renderLabel(text) {
	const div = document.createElement("div");
	div.id = "label"
	div.textContent = text;
	container.appendChild(div);
}

function renderDeadline(text) {
	const div = document.createElement("div");
	div.id = "deadline";
	div.textContent = text;
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
	iframe.id = "widget";
	iframe.src = `https://store.steampowered.com/widget/${appid}/`;
	iframe.width = "646";
	iframe.height = "190";
	iframe.frameBorder = "0";

	container.appendChild(iframe);
}

function renderMissing(query) {
	const div = document.createElement("div");
	div.textContent = `Could not resolve game: ${query}`;
	div.style.color = "crimson";
	container.appendChild(div);
}

/* ---------- main loader ---------- */

async function loadGames() {
	const response = await fetch("/api/games");

	if (!response.ok) {
		throw new Error("Failed to load game list");
	}

	const { items } = await response.json();

	for (const item of items) {
		if (item.kind === "header1") {
			renderHeader1(item.text);
		} else if (item.kind === "header2") {
			renderHeader2(item.text);
		} else if (item.kind === "header3") {
			renderHeader3(item.text);
		} else if (item.kind === "label") {
			renderLabel(item.text);
		} else if (item.kind === "deadline") {
			renderDeadline(item.text);
		} else if (item.game) {
			//renderGameTitle(item.game.appName);
			renderGameWidget(item.game.appid);
		} else {
			renderMissing(item.query);
		}
	}
}

loadGames().catch(err => {
	console.error("Failed to load games", err);
});
