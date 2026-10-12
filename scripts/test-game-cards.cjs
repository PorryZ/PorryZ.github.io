const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cards = require("../assets/js/game-cards.js");
const tests = [];
function test(name, run) { run(); tests.push(name); }
test("name is required, optional fields stay absent", () => {
    assert.throws(() => cards.normalize({}), /名称/);
    const game = cards.normalize({ name: "Only a title" });
    assert.equal(game.review, undefined);
    assert.equal(game.achievements, undefined);
    assert.equal(game.playtimeMinutes, undefined);
    assert.equal(game.screenshots.length, 0);
});
test("zero values and original review survive", () => {
    const review = "第一段。\n\n第二段！ <b>保留字面文字</b>";
    const game = cards.normalize({ name: "Test", playtimeMinutes: 0, achievements: { unlocked: 0 }, review });
    assert.equal(game.playtimeMinutes, 0);
    assert.deepEqual(game.achievements, { unlocked: 0, total: undefined });
    assert.equal(game.review, review);
});
test("invalid and conflicting counts are rejected or omitted", () => {
    assert.throws(() => cards.normalize({ name: "Test", achievements: { unlocked: 2, total: 1 } }), /超过/);
    assert.equal(cards.normalize({ name: "Test", playtimeMinutes: -1, achievements: { unlocked: -1 } }).achievements, undefined);
    assert.equal(cards.normalize({ name: "Test", achievements: { total: 0 } }).achievements.total, 0);
});
test("screenshot URLs and main image selection", () => {
    const game = cards.normalize({ name: "Test", screenshots: ["javascript:bad", "assets/a.png", { src: "https://example.com/b.png", position: "40% 30%" }], primaryScreenshot: 1 });
    assert.equal(game.screenshots.length, 2);
    assert.equal(game.screenshots[game.primaryScreenshot].src, "https://example.com/b.png");
    assert.equal(game.screenshots[1].position, "40% 30%");
});
test("update in place, merge achievements, new records first", () => {
    const original = [{ id: "a", name: "Alpha", achievements: { unlocked: 4, total: 10 } }, { id: "b", name: "Beta" }];
    const updated = cards.upsert(original, { name: " alpha ", achievements: { unlocked: 5 }, review: "原文" });
    assert.equal(updated.length, 2);
    assert.equal(updated[0].id, "a");
    assert.equal(updated[0].achievements.total, 10);
    assert.equal(updated[1].id, "b");
    assert.equal(cards.upsert(updated, { name: "New" })[0].name, "New");
    assert.throws(() => cards.upsert(original, { name: "Alpha", achievements: { unlocked: 11 } }), /超过/);
    assert.equal(original[0].achievements.unlocked, 4);
});
test("linked Steam time, explicit clearing and newest duplicate priority", () => {
    const steam = [{ appId: 1, playtimeForever: 120 }];
    const records = [{ name: "Alpha", steamAppId: 1, review: "新" }, { name: "Alpha", steamAppId: 1, review: "旧" }];
    const result = cards.prepare(records, steam);
    assert.equal(result.length, 1);
    assert.equal(result[0].review, "新");
    assert.equal(result[0].playtimeMinutes, 120);
    assert.equal(cards.prepare([{ name: "Alpha", steamAppId: 1, playtimeMinutes: null }], steam)[0].playtimeMinutes, undefined);
});
test("linked formal records use the matching local Steam time", () => {
    const records = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/games.json"), "utf8"));
    const steam = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/steam.json"), "utf8"));
    const prepared = cards.prepare(records.games, steam.games);
    prepared.filter((game) => game.steamAppId).forEach((game) => {
        const synced = steam.games.find((item) => item.appId === game.steamAppId);
        assert.ok(synced);
        const record = records.games.find((item) => item.steamAppId === game.steamAppId);
        if (!Object.hasOwn(record, "playtimeMinutes")) assert.equal(game.playtimeMinutes, synced.playtimeForever);
    });
});
test("default colors do not change when another game is added", () => {
    const original = cards.prepare([{ name: "Alpha" }, { name: "Beta" }]);
    const next = cards.prepare([{ name: "New" }, { name: "Alpha" }, { name: "Beta" }]);
    assert.equal(original[0].theme, next[1].theme);
    assert.equal(original[1].theme, next[2].theme);
});
console.log(`${tests.length} checks passed:\n${tests.map((name) => `  ✓ ${name}`).join("\n")}`);
