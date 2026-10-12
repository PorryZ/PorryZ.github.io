#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/steam.json");
const execFileAsync = promisify(execFile);

async function loadDotEnv() {
  const envPath = resolve(root, ".env");

  try {
    const text = await readFile(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const index = trimmed.indexOf("=");
      if (index === -1) continue;

      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadDotEnv();

const apiKey = process.env.STEAM_API_KEY;
const steamId = process.env.STEAM_ID64;

if (!apiKey || !steamId) {
  console.error("Missing STEAM_API_KEY or STEAM_ID64.");
  console.error("Create a local .env file from .env.example, then run: node scripts/sync-steam.mjs");
  process.exit(1);
}

const endpoints = {
  player:
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
  owned:
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`,
  recent:
    `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=10`
};

function redactUrl(url) {
  return String(url).replace(/key=[^&\s]+/gi, "key=[redacted]").split(apiKey).join("[redacted]");
}

async function getJson(url) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { stdout } = await execFileAsync("curl", [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "30",
        "--user-agent",
        "PorryZ.github.io Steam sync",
        url
      ]);

      return JSON.parse(stdout);
    } catch (error) {
      lastError = new Error(`Failed to fetch ${redactUrl(url)}: ${redactUrl(error.message)}`);
      if (attempt < 3) {
        await new Promise((resolveRetry) => setTimeout(resolveRetry, attempt * 1000));
      }
    }
  }

  throw lastError;
}

function headerImage(appId) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function normalizeGame(game) {
  const appId = Number(game.appid);
  return {
    appId,
    name: game.name || "Unknown Game",
    playtimeForever: Number(game.playtime_forever) || 0,
    playtimeTwoWeeks: Number(game.playtime_2weeks) || 0,
    lastPlayed: game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toISOString() : null,
    headerImage: headerImage(appId)
  };
}

const [playerData, ownedData, recentData] = await Promise.all([
  getJson(endpoints.player),
  getJson(endpoints.owned),
  getJson(endpoints.recent)
]);

// Private or malformed API responses must not replace the last good snapshot.
const player = playerData.response?.players?.[0];
const ownedResponse = ownedData.response;
if (!player || player.steamid !== steamId) {
  throw new Error("Steam player data is unavailable. The previous snapshot was preserved.");
}
if (!Number.isInteger(ownedResponse?.game_count) || ownedResponse.game_count < 0 ||
    (ownedResponse.games?.length || 0) !== ownedResponse.game_count ||
    (ownedResponse.games !== undefined && !Array.isArray(ownedResponse.games))) {
  throw new Error("Steam game library is unavailable or incomplete. Check game-details privacy. The previous snapshot was preserved.");
}
if (!Number.isInteger(recentData.response?.total_count) || recentData.response.total_count < 0 ||
    (recentData.response.games !== undefined && !Array.isArray(recentData.response.games)) ||
    (recentData.response.total_count > 0 && !recentData.response.games?.length)) {
  throw new Error("Steam recent games are unavailable. The previous snapshot was preserved.");
}
const ownedGames = (ownedResponse.games || [])
  .map(normalizeGame)
  .sort((a, b) => b.playtimeForever - a.playtimeForever);
const recentGames = (recentData.response?.games || [])
  .map(normalizeGame)
  .sort((a, b) => b.playtimeTwoWeeks - a.playtimeTwoWeeks);

const totalMinutes = ownedGames.reduce((sum, game) => sum + game.playtimeForever, 0);
const recentMinutes = recentGames.reduce((sum, game) => sum + game.playtimeTwoWeeks, 0);

const data = {
  steamId,
  personaName: player.personaname || "Steam 玩家",
  personaState: Number.isFinite(player.personastate) ? player.personastate : null,
  profileUrl: player.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
  avatar: player.avatarfull || "",
  lastUpdated: new Date().toISOString(),
  summary:
    `已同步 ${ownedGames.length} 款 Steam 游戏，累计约 ${Math.round(totalMinutes / 60)} 小时，近两周约 ${Math.round(recentMinutes / 60)} 小时。`,
  recentGames,
  games: ownedGames
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Steam data written to ${outputPath}`);
