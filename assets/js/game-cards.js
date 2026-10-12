/* Shared, buildless component. Content is always written with textContent. */
((root) => {
    "use strict";
    const themes = ["coral", "mint", "blue", "lime", "violet"];
    const number = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
    const integer = (value) => number(value) && Number.isInteger(value);
    const nameKey = (value) => String(value || "").normalize("NFKC").trim().toLocaleLowerCase();
    function defaultTheme(record) {
        const key = String(record.id || record.steamAppId || nameKey(record.name));
        const hash = Array.from(key).reduce((sum, char) => (sum * 31 + char.codePointAt(0)) >>> 0, 0);
        return themes[hash % themes.length];
    }
    const sameGame = (a, b) => Boolean(
        (a.id && b.id && a.id === b.id) ||
        (a.steamAppId && b.steamAppId && a.steamAppId === b.steamAppId) ||
        (nameKey(a.name) && nameKey(a.name) === nameKey(b.name))
    );

    function imageSource(value) {
        if (typeof value !== "string" || !value.trim()) return null;
        // Local assets and explicit HTTP(S) images only; never infer a cover URL.
        const src = value.trim();
        if (/^(https?:\/\/)/i.test(src)) return src;
        if (/^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith("//") || src.includes("\\")) return null;
        return src;
    }

    function normalize(record, index = 0) {
        if (!record || typeof record.name !== "string" || !record.name.trim()) {
            throw new TypeError("游戏名称不能为空");
        }
        const game = {
            name: record.name.trim(),
            theme: themes.includes(record.theme) ? record.theme : defaultTheme(record),
            screenshots: []
        };
        if (typeof record.id === "string" && record.id.trim()) game.id = record.id.trim();
        if (integer(record.steamAppId) && record.steamAppId > 0) game.steamAppId = record.steamAppId;
        if (number(record.playtimeMinutes)) game.playtimeMinutes = record.playtimeMinutes;
        const achievements = record.achievements;
        if (achievements) {
            const unlocked = integer(achievements.unlocked) ? achievements.unlocked : undefined;
            const total = integer(achievements.total) ? achievements.total : undefined;
            if (unlocked !== undefined && total !== undefined && unlocked > total) {
                throw new RangeError(`${game.name} 的已解锁成就不能超过总数`);
            }
            if (unlocked !== undefined || total !== undefined) game.achievements = { unlocked, total };
        }
        if (typeof record.review === "string" && record.review.trim()) game.review = record.review;
        (Array.isArray(record.screenshots) ? record.screenshots : []).forEach((image) => {
            const data = typeof image === "string" ? { src: image } : image;
            const src = imageSource(data?.src);
            if (!src) return;
            game.screenshots.push({
                src,
                alt: typeof data.alt === "string" && data.alt.trim() ? data.alt : `${game.name} 游戏截图`,
                position: /^\d{1,3}% \d{1,3}%$/.test(data.position || "") ? data.position : "50% 50%"
            });
        });
        const main = integer(record.primaryScreenshot) ? record.primaryScreenshot : 0;
        game.primaryScreenshot = main < game.screenshots.length ? main : 0;
        return game;
    }

    // Array order is the publication order. The first (newest) duplicate wins.
    function prepare(records, steamGames = []) {
        if (!Array.isArray(records)) throw new TypeError("games 必须是数组");
        const unique = [];
        records.forEach((record) => {
            const existing = unique.findIndex((game) => sameGame(game, record));
            if (existing < 0) unique.push(record);
            else unique[existing] = { ...record, ...unique[existing] };
        });
        return unique.map((record, index) => {
            const game = normalize(record, index);
            const synced = (Array.isArray(steamGames) ? steamGames : []).find((item) => item.appId === game.steamAppId);
            if (!Object.hasOwn(record, "playtimeMinutes") && number(synced?.playtimeForever)) {
                game.playtimeMinutes = synced.playtimeForever;
            }
            return game;
        });
    }

    // Updates stay in place; new games go first. null explicitly clears a field.
    function upsert(records, patch) {
        normalize(patch);
        const index = records.findIndex((record) => sameGame(record, patch));
        if (index < 0) return [patch, ...records];
        const result = records.slice();
        result[index] = { ...records[index], ...patch };
        if (patch.achievements && records[index].achievements) {
            result[index].achievements = { ...records[index].achievements, ...patch.achievements };
        }
        normalize(result[index]);
        return result;
    }

    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function button(className, label, action) {
        const element = node("button", className, label);
        element.type = "button";
        element.addEventListener("click", action);
        return element;
    }

    function createViewer() {
        const dialog = node("dialog", "game-viewer");
        dialog.setAttribute("aria-label", "游戏截图查看器");
        const panel = node("div", "game-viewer-panel");
        const toolbar = node("div", "game-viewer-toolbar");
        const title = node("p", "game-viewer-title");
        const close = button("game-control", "关闭 ×", () => dialog.close());
        toolbar.append(title, close);
        const frame = node("div", "game-viewer-frame");
        const image = node("img", "game-viewer-image");
        const failure = node("p", "game-viewer-error", "这张截图未能加载，请稍后重试。");
        failure.hidden = true;
        image.addEventListener("error", () => { image.hidden = true; failure.hidden = false; });
        image.addEventListener("load", () => { image.hidden = false; failure.hidden = true; });
        frame.append(image, failure);
        const navigation = node("div", "game-viewer-nav");
        const previous = button("game-control", "← 上一张", () => show(current - 1));
        const caption = node("p", "game-viewer-caption");
        caption.setAttribute("aria-live", "polite");
        const next = button("game-control", "下一张 →", () => show(current + 1));
        navigation.append(previous, caption, next);
        panel.append(toolbar, frame, navigation);
        dialog.append(panel);
        document.body.append(dialog);
        let game, current = 0, opener, scrollY, savedOverflow, pointerStart;

        function show(index) {
            current = (index + game.screenshots.length) % game.screenshots.length;
            const screenshot = game.screenshots[current];
            image.hidden = false;
            failure.hidden = true;
            image.src = screenshot.src;
            image.alt = screenshot.alt;
            caption.textContent = `${current + 1} / ${game.screenshots.length} · ${screenshot.alt}`;
            previous.hidden = next.hidden = game.screenshots.length < 2;
        }
        dialog.addEventListener("keydown", (event) => {
            if (event.key === "Tab") {
                const controls = [close, previous, next].filter((control) => !control.hidden);
                const active = controls.indexOf(document.activeElement);
                const step = event.shiftKey ? -1 : 1;
                const index = active < 0 ? 0 : (active + step + controls.length) % controls.length;
                event.preventDefault();
                controls[index].focus();
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                show(current + (event.key === "ArrowLeft" ? -1 : 1));
            }
        });
        dialog.addEventListener("click", (event) => {
            if (event.target !== dialog) return;
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        });
        frame.addEventListener("pointerdown", (event) => { pointerStart = [event.clientX, event.clientY]; });
        frame.addEventListener("pointerup", (event) => {
            if (!pointerStart) return;
            const dx = event.clientX - pointerStart[0], dy = event.clientY - pointerStart[1];
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
            pointerStart = null;
        });
        frame.addEventListener("pointercancel", () => { pointerStart = null; });
        dialog.addEventListener("close", () => {
            document.body.style.overflow = savedOverflow;
            opener?.focus({ preventScroll: true });
            window.scrollTo({ top: scrollY, behavior: "instant" });
        });
        return {
            open(record, index, trigger) {
                game = record; opener = trigger;
                title.textContent = record.name;
                show(index);
                scrollY = window.scrollY;
                savedOverflow = document.body.style.overflow;
                dialog.showModal();
                document.body.style.overflow = "hidden";
                close.focus();
            },
            destroy() { if (dialog.open) dialog.close(); dialog.remove(); }
        };
    }

    function renderCard(game, index, viewer) {
        const hasImages = game.screenshots.length > 0;
        const rich = Boolean(game.review);
        const card = node("article", `journal-card theme-${game.theme} journal-card--${hasImages ? "visual" : rich ? "editorial" : "compact"}`);
        card.style.setProperty("--entry-delay", `${Math.min(index, 4) * 60}ms`);
        const body = node("div", "journal-card-body");
        const top = node("div", "journal-card-top");
        top.append(node("span", "journal-card-tag", "PLAY LOG"), node("span", "journal-card-number", String(index + 1).padStart(2, "0")));
        const heading = node("h3", "journal-card-title", game.name);
        body.append(top, heading);
        if (game.playtimeMinutes !== undefined || game.achievements) {
            const facts = node("dl", "journal-facts");
            const fact = (label, value) => {
                const group = node("div", "journal-fact");
                group.append(node("dt", "", label), node("dd", "", value));
                facts.append(group);
                return group;
            };
            if (game.playtimeMinutes !== undefined) {
                const time = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(game.playtimeMinutes / 60);
                fact("游戏时长", `${time} 小时`);
            }
            if (game.achievements) {
                const { unlocked, total } = game.achievements;
                const value = unlocked !== undefined ? `${unlocked}${total !== undefined ? ` / ${total}` : ""}` : `${total}`;
                const group = fact(unlocked !== undefined ? "已解锁成就" : "成就总数", value);
                if (unlocked !== undefined && total > 0) {
                    const progress = node("progress", "journal-progress");
                    progress.max = total;
                    progress.value = unlocked;
                    progress.setAttribute("aria-label", `成就进度：${unlocked} / ${total}`);
                    group.append(progress);
                }
            }
            body.append(facts);
        }
        if (game.review) {
            const review = node("div", "journal-review");
            review.append(node("p", "journal-review-label", "我的测评"));
            const long = game.review.length > 180 || game.review.split("\n").length > 3;
            if (long) {
                const details = node("details", "journal-review-details");
                const summary = node("summary", "journal-review-summary");
                const firstLines = game.review.split("\n").slice(0, 3).join("\n");
                const excerpt = game.review.slice(0, Math.min(180, firstLines.length));
                summary.append(node("span", "journal-review-excerpt", `${excerpt}${excerpt.length < game.review.length ? "…" : ""}`));
                const control = node("span", "journal-review-toggle");
                control.append(node("span", "review-more", "展开全文 ↗"), node("span", "review-less", "收起全文 ↙"));
                summary.append(control);
                details.append(summary, node("p", "journal-review-full", game.review));
                review.append(details);
            } else review.append(node("p", "journal-review-full", game.review));
            body.append(review);
        }
        if (hasImages) {
            const media = node("div", "journal-media");
            const mainIndex = game.primaryScreenshot;
            const main = game.screenshots[mainIndex];
            const visual = button("journal-visual", "", (event) => viewer.open(game, mainIndex, event.currentTarget));
            visual.setAttribute("aria-label", `查看 ${game.name} 截图 ${mainIndex + 1}，共 ${game.screenshots.length} 张`);
            const image = node("img", "journal-screenshot");
            image.src = main.src; image.alt = main.alt; image.loading = "lazy";
            image.style.objectPosition = main.position;
            image.addEventListener("error", () => {
                image.hidden = true;
                visual.classList.add("journal-visual--failed");
            });
            const error = node("span", "journal-image-error", "截图加载失败 · 点击重试查看");
            visual.append(image, error, node("span", "journal-image-label", `查看截图 ↗${game.screenshots.length > 1 ? ` · ${game.screenshots.length} 张` : ""}`));
            media.append(visual);
            card.append(media);
            if (game.screenshots.length > 1) {
                const gallery = node("div", "journal-gallery");
                game.screenshots.slice(0, 3).forEach((shot, shotIndex) => {
                    const thumbnail = button("journal-thumbnail", String(shotIndex + 1).padStart(2, "0"), (event) => viewer.open(game, shotIndex, event.currentTarget));
                    thumbnail.setAttribute("aria-label", `查看 ${game.name} 第 ${shotIndex + 1} 张截图`);
                    const thumb = node("img", "", "");
                    thumb.src = shot.src; thumb.alt = ""; thumb.loading = "lazy";
                    thumb.style.objectPosition = shot.position;
                    thumb.addEventListener("error", () => { thumb.hidden = true; });
                    thumbnail.prepend(thumb);
                    gallery.append(thumbnail);
                });
                if (game.screenshots.length > 3) gallery.append(button("game-control journal-gallery-more", `全部 ${game.screenshots.length} 张 ↗`, (event) => viewer.open(game, mainIndex, event.currentTarget)));
                body.append(gallery);
            }
        }
        card.append(body);
        return card;
    }

    const mounts = new WeakMap();
    function mount(container, games) {
        mounts.get(container)?.destroy();
        const viewer = games.some((game) => game.screenshots.length) ? createViewer() : null;
        container.replaceChildren(...games.map((game, index) => renderCard(game, index, viewer)));
        let observer;
        if ("IntersectionObserver" in root && !root.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.08 });
            container.querySelectorAll(".journal-card").forEach((card) => {
                card.classList.add("will-enter");
                observer.observe(card);
            });
        }
        const handle = { destroy() { observer?.disconnect(); viewer?.destroy(); } };
        mounts.set(container, handle);
        return handle;
    }

    const api = { normalize, prepare, upsert, mount };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.GameCards = api;
})(globalThis);
