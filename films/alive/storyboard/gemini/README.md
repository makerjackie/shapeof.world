# Gemini 分镜过程

用 OpenCode 跑 Gemini 4：`opencode run -m opencode-go/gemini-4-argon-contributor "<提示词>"`，在 `/tmp/alive-gemini/` 里跑（不在仓库里，免得它改文件）。三轮：

1. `1-prompt-concepts.md` → `1-reply-concepts.md`：完整简报，要三个彻底不同的概念。
2. `2-prompt-storyboard.md` → `2-reply-storyboard.md`：总编选一《出格》并给出修改意见，要完整分镜。
3. `3-prompt-revise.md` → `3-reply-storyboard.md`：总编评审（字太多、几处说法偏了）和小节骨架，要第二版分镜。

定稿在上一级的 `STORYBOARD.md`：在第三轮基础上由总编改了史实和措辞。
