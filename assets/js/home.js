const els = {
    persona: document.getElementById("persona"),
    onlineState: document.getElementById("online-state"),
    lastUpdated: document.getElementById("last-updated"),
    totalGames: document.getElementById("total-games"),
    totalHours: document.getElementById("total-hours"),
    recentHours: document.getElementById("recent-hours"),
    summary: document.getElementById("steam-summary"),
    recentGames: document.getElementById("recent-games"),
    profileLink: document.getElementById("steam-profile-link"),
    syncNote: document.getElementById("sync-note")
};

const stateText = {
    0: "离线",
    1: "在线",
    2: "忙碌",
    3: "离开",
    4: "打盹",
    5: "想交易",
    6: "想玩游戏"
};

function hours(minutes) {
    return Number.isFinite(minutes) ? Math.round(minutes / 60) : 0;
}

function formatDate(value) {
    if (!value) return "尚未同步";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "尚未同步";
    return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function renderSteam(data) {
    const games = Array.isArray(data.games) ? data.games : [];
    const recent = Array.isArray(data.recentGames) && data.recentGames.length ? data.recentGames : games.slice(0, 5);
    const totalMinutes = games.reduce((sum, game) => sum + (Number(game.playtimeForever) || 0), 0);
    const recentMinutes = recent.reduce((sum, game) => sum + (Number(game.playtimeTwoWeeks) || 0), 0);

    els.persona.textContent = data.personaName || "Steam 玩家";
    els.onlineState.textContent = stateText[data.personaState] || data.status || "状态未知";
    els.lastUpdated.textContent = `同步 ${formatDate(data.lastUpdated)}`;
    els.totalGames.textContent = games.length || "--";
    els.totalHours.textContent = totalMinutes ? `${hours(totalMinutes)}h` : "--";
    els.recentHours.textContent = recentMinutes ? `${hours(recentMinutes)}h` : "--";
    els.summary.textContent = data.summary || "Steam 库存、最近游玩和累计时长会在这里汇总。";
    els.syncNote.textContent = data.steamId ? `SteamID64: ${data.steamId}` : "数据源：data/steam.json";

    if (data.profileUrl) {
        els.profileLink.href = data.profileUrl;
    }

    if (!recent.length) return;

    els.recentGames.innerHTML = recent.slice(0, 6).map((game) => {
        const appId = Number(game.appId);
        const cover = game.headerImage || (appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg` : "");
        const forever = hours(Number(game.playtimeForever) || 0);
        const twoWeeks = hours(Number(game.playtimeTwoWeeks) || 0);
        const meta = [
            forever ? `累计 ${forever}h` : "暂无时长",
            twoWeeks ? `近两周 ${twoWeeks}h` : "",
            game.lastPlayed ? `上次 ${formatDate(game.lastPlayed)}` : ""
        ].filter(Boolean).join("<span>/</span>");

        return `
            <li class="game-item">
                ${cover ? `<img class="game-cover" src="${escapeHtml(cover)}" alt="${escapeHtml(game.name || "Steam 游戏")} 封面" loading="lazy">` : `<span class="game-cover" aria-hidden="true"></span>`}
                <div>
                    <p class="game-name">${escapeHtml(game.name || "未命名游戏")}</p>
                    <div class="game-meta">${meta}</div>
                </div>
            </li>
        `;
    }).join("");
}

fetch("data/steam.json", { cache: "no-store" })
    .then((response) => {
        if (!response.ok) throw new Error("Steam data not found");
        return response.json();
    })
    .then(renderSteam)
    .catch(() => {
        els.persona.textContent = "Steam 数据待同步";
        els.onlineState.textContent = "未连接";
        els.lastUpdated.textContent = "尚未更新";
    });
