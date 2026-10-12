const testReview = "【开发测试文字，不是用户测评】\n这一段只用来验证卡片的阅读体验。短句应该保留原文，长段落应该能够展开。标题和截图各自保留足够的空间，辅助数字不会挤占正文。\n第二段用于检查换行与段落。展开后应完整保留输入文字；收起后应返回摘要。触屏用户不需要悬停就能发现入口，键盘用户也应该能够打开与收起全文。\n最后一段用来验证较长内容的高度变化。这些句子没有描述任何真实游戏，不会进入正式主页，也不会产生评分。";
const images = [
    { src: "fixture-mint.svg", alt: "开发测试图 A · 几何山谷", position: "50% 55%" },
    { src: "fixture-blue.svg", alt: "开发测试图 B · 几何城市" },
    { src: "fixture-mint.svg", alt: "开发测试图 C · 画廊翻页验证" },
    { src: "fixture-blue.svg", alt: "开发测试图 D · 画廊末张验证" }
];
const scenarios = {
    all: [
        { name: "开发预览 · 截图与长评", theme: "mint", screenshots: images, playtimeMinutes: 720, achievements: { unlocked: 12, total: 40 }, review: testReview },
        { name: "开发预览 · 只有名字", theme: "coral" },
        { name: "开发预览 · 文字手记", theme: "blue", review: testReview },
        { name: "开发预览 · 简短测评", theme: "violet", review: "【测试文字】一句话也应该有完整、清晰的排版。", achievements: { unlocked: 8 } },
        { name: "开发预览 · 零值与总数", theme: "lime", playtimeMinutes: 0, achievements: { total: 24 } }
    ],
    single: [{ name: "开发预览 · 单张截图", screenshots: images.slice(0, 1) }],
    broken: [{ name: "开发预览 · 图片故障", screenshots: [{ src: "missing-fixture.png", alt: "故障测试图" }] }],
    empty: []
};
function renderScenario() {
    const records = scenarios[document.getElementById("scenario").value];
    GameCards.mount(document.getElementById("preview-cards"), GameCards.prepare(records));
    document.getElementById("preview-status").textContent = `当前场景：${records.length} 张测试卡片`;
}
document.getElementById("scenario").addEventListener("change", renderScenario);
renderScenario();
