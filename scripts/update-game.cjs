/* node scripts/update-game.cjs <UTF-8 JSON patch file> */
const fs = require("node:fs");
const path = require("node:path");
const { prepare, upsert } = require("../assets/js/game-cards.js");
try {
    if (!process.argv[2]) throw new Error("用法：node scripts/update-game.cjs <游戏资料.json>");
    const input = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), "utf8").replace(/^\uFEFF/, ""));
    const target = path.join(__dirname, "../data/games.json");
    const data = JSON.parse(fs.readFileSync(target, "utf8"));
    const next = upsert(data.games, input);
    prepare(next); // Validate the complete result before writing.
    fs.writeFileSync(target, `${JSON.stringify({ ...data, games: next }, null, 2)}\n`);
    console.log(`已保存：${input.name}（${next.length} 条记录）`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
