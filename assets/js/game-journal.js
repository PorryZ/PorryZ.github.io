/* Authored records decide order. Steam supplies only explicitly linked playtime. */
(async () => {
    const section = document.getElementById("game-journal");
    if (!section) return;
    try {
        const [records, steam] = await Promise.all([
            fetch("data/games.json", { cache: "no-store" }).then((response) => {
                if (!response.ok) throw new Error("Game journal unavailable");
                return response.json();
            }),
            fetch("data/steam.json", { cache: "no-store" })
                .then((response) => response.ok ? response.json() : null).catch(() => null)
        ]);
        const games = GameCards.prepare(records.games, steam?.games);
        GameCards.mount(document.getElementById("game-cards"), games);
        document.getElementById("journal-count").textContent = String(games.length).padStart(2, "0");
        section.hidden = games.length === 0;
    } catch (error) {
        document.getElementById("journal-load-error").hidden = false;
        console.error("Game journal:", error);
    }
})();
