# Hook, story, cover, and publishing

The rest of the skill makes the demo true and smooth. This file is about getting viewers to stop, watch to the end, and find the next episode. The skill's rule that the demo never lies covers every word here too: the hook, the captions, the cover, and the title promise only what the episode shows.

## Contents

- [Series files](#series-files)
- [Hook](#hook)
- [Story templates](#story-templates)
- [Captions](#captions)
- [Cover](#cover)
- [Publish package](#publish-package)

## Series files

Two files in the video project, copied from `templates/` once per series. Read both before writing a storyboard, and update them after publishing.

- **`series.md`**: who the videos are for; the pain map (each recurring problem of that audience → the feature that solves it → its episode and status); fixed formats (title pattern, Bilibili 分区 / 合集 / default tags, YouTube playlist and title language); reference videos by other creators that performed well, each with its structure written out (hook, beat order, cover idea). Most viewers are beginners with the same few problems, so cover the core problems repeatedly from new angles rather than hunting for novel topics.
- **`metrics.md`**: one row per episode per platform, filled in by the user about 7 days after publishing (you cannot read platform analytics). It records the hook type, story template, and cover variant next to the results, so it doubles as the series' own swipe file.

Using them:

- Pick the hook type and story template that the log favours. Without a clear winner, rotate, and don't use the same hook type three episodes in a row.
- When an episode clearly beats the series median (views, cover click-through, or average watch time), add follow-up angles on its problem to the pain map.
- A topic that underperformed comes back only with a new hook or template, never the same angle again.

## Hook

The intro line is the hook, then the plugin name and the topic: "笔记一多，想找的那篇总找不到？Card Workspace 全文搜索". It is spoken from 0.3 s. The intro card shows the hook alone, since the wordmark already says the name.

| Type | Pattern | Example |
|---|---|---|
| Problem (痛点) | Name the chore the viewer is living with, often as a question or "如果你……" | 笔记一多，想找的那篇总找不到？ |
| Specific number (具体数字) | A count, a duration, or a step count from this video | 14 篇笔记，一搜只剩 3 篇 |
| Negative framing (负面偏好) | 别再……, 再也不会……, ……的坑: the loss or trap the feature removes | 别再一个个文件夹翻笔记了 |

Combine two types in one line ("别再翻文件夹了：14 篇一搜剩 3 篇") or rotate them across episodes; record the choice in `metrics.md`.

- **Every number is true in this video.** A count comes from the snapshot through the product's own functions (`scripts/eval.mjs` on the stage, or `director.read`), a duration from the episode clock (for example `T.commit - T.clickSearch`), a step count from the storyboard. Read it before synthesis; when the data changes, the line changes.
- **Length**: the hook ≤ 16 CJK characters (about 3.5 s at the verified 4–5 characters per second); the whole intro line ≤ about 5.5 s.
- **Negative framing targets the viewer's chore**, never another plugin, app, or person.
- **No claim the viewer cannot check in the video**: no 最好用, 唯一, 最快, 100%. Conviction comes from stating the result plainly ("一搜就有"), not from superlatives.
- **Recorded mode**: the intro card's `title` carries the hook (≤ 12 characters) and `subtitle` the topic ([recorded.md](recorded.md#projectjson)). The user's spoken opening is theirs; suggest a hook sentence in the recording tips if they want one.

## Story templates

Each template fills the usual 4–6 numbered beats. The last beat always pays off the hook: the hook's question gets its answer on screen.

| Template | Fits | Beats |
|---|---|---|
| A. Problem → fix (PAS) | Problem hooks | The hook names the chore; the beats perform the feature; the last beat states the result with a number from the video |
| B. Before / after | Number hooks | Beat 1 shows the chore in the same product without the feature (scrolling the full stream, opening notes one by one), real UI and real data; then the feature; the explainer shows both counts |
| C. Trap warning | Negative hooks | Beat 1 names the trap in one line over the starting UI state; then the fix; the last beat says what the viewer keeps |
| D. List | Settings-heavy episodes | "3 个用法……": one item per beat; the numbered captions are the list |

The "before" in template B is always shown in the real product. Never mock up another app to look worse.

## Captions

Check every line before synthesis, since each changed line is billed again:

- It says what the viewer gets, or the action together with its effect: "搜索就在工具栏，不用离开卡片流", not "点击工具栏的搜索按钮".
- Across the hook and the captions, the episode uses at least two of: a specific number, a problem callout, a target callout ("笔记多的人……"), a warning, a stated benefit.
- The explainer's truth test applies: the viewer can confirm the line by looking at the UI.
- One line ≤ about 24 CJK characters ([voice.md](voice.md#lines)).

## Cover

Every episode gets its own cover, designed separately from the video's first frame, so the feed never shows the same brand card twice. Work in `covers/<episode>-a.html`, `-b`, `-c` (copied from `templates/covers/example.html`) and copy the chosen variant to `covers/<episode>.html`.

```bash
node scripts/cover.mjs covers/<episode>-a.html
```

| Output | Use |
|---|---|
| `renders/<name>-cover-bilibili.png` | 1440 × 1080, the page at `?ratio=4x3`. Bilibili shows 4:3 in the app feed and crops to 16:10 or 16:9 around the centre elsewhere. Upload it as one image and check the crops in the upload preview |
| `renders/<name>-cover-youtube.jpg` | 1280 × 720, the page's `?ratio=16x9` layout at 1920 × 1080 scaled by 2/3; the script warns above YouTube's 2 MB limit |
| `renders/<name>-cover-review.png` | Each at 480 px wide: the 4:3 cover, its 16:10 and 16:9 crops, and the YouTube cover. If the headline is hard to read here, it is too long or too small |

The page reads `?ratio=` into `html[data-ratio]`; the 16:9 layout uses the same height and 480 px more width, so it widens the subject rather than rearranging it. The script warns when `#cover` does not fill the frame, stops when a `style.json` font did not load, and warns about text in a system font (pin that font, or the cover differs between machines).

Layout, as on the approved series covers. Look at them before designing a new one, even when the series project's earlier covers are not at hand:

| [Diagrams](../assets/covers/15-diagrams.jpg) | [Quick input](../assets/covers/16-quick-input.jpg) | [Search](../assets/covers/17-search.jpg) | [Icons](../assets/covers/21-icons.jpg) |
|---|---|---|---|
| Before → after across two panes | One action, its result fanned out | The result itself, in a replica | A crowd of results around one picker |

Match their scale and density rather than copying their subjects: each new cover still takes its subject from its own episode.

- **Badge** top left: platform logo + product icon + product name (Archivo). It is secondary, so it may sit in the strip that Bilibili's 16:9 crop removes.
- **Headline** 110–150 px in the theme's interface font, one phrase in the accent with the hatched underline. It is the hook compressed to 6–10 characters, not the video title word for word: viewers read the title and the cover together as one promise, so repeating the same words wastes one of them.
- **Subject**: the episode's key moment, enlarged. Either a 3× screenshot of the stage at that state (`scripts/shot.mjs` with scale 3), or an HTML replica whose every title, snippet, and count is read from the snapshot. Add one or two callout tags and optionally a cursor.
- **Safe areas**: the headline and subject stay inside the 16:10 band (y 90–990 of the 1440 × 1080 frame). Both platforms put the duration in the bottom-right corner, and Bilibili overlays play counts along the bottom, so keep about 120 px at the bottom free of text that matters.
- **Variants**: two or three, each from a different angle (the result itself, before / after, the trap), each with its own headline. Show the user the review sheets and let them pick.

## Publish package

After the final MP4 and the chosen cover, write `renders/<episode>.publish.md` for the user to paste into the upload pages. State facts only from the video or from the user: no invented download counts, ratings, or user numbers.

```markdown
# <episode> 发布包

## Bilibili
- 标题（≤ 80 字）：
  1. <痛点式>（推荐）
  2. <数字式>
  3. <对比式>
- 封面：renders/<episode>-cover-bilibili.png
- 分区 / 合集：<series.md>
- 标签（≤ 10 个）：Obsidian, Obsidian插件, 笔记软件, 知识管理, Card Workspace, <功能词>…
- 简介（≤ 2000 字）：
  <一句话价值：解决什么问题>
  本期演示：
  1. <节拍 1 的结果>
  2. …
  安装：在 Obsidian 第三方插件市场搜索 Card Workspace
  系列合集：<链接>
  音乐："Somewhere Sunny (ver 2)" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License
- 分段章节（录屏模式）：renders/<id>.chapters.txt，上传后在 稿件管理 → 个性化配置 填写
- 置顶评论：<一个让观众讲自己做法的问题> + 安装方式

## YouTube
- Title (≤ 100 characters): <the same candidates, in the series' title language>
- Thumbnail: renders/<episode>-cover-youtube.jpg
- Description (≤ 5000 characters):
  <the first two lines carry the value; they show before "more">
  <the same body as the Bilibili 简介>
  <chapters from renders/<id>.chapters.txt, only when rec:assemble reported no problem>
  <music credit>
  #Obsidian #<feature> #<one more>
- Tags (≤ 500 characters in total): <the Bilibili tags plus English equivalents>
- Playlist: <series.md>
- Subtitles (recorded mode): upload renders/<id>.srt; the captions are burned in, but the track enables auto-translate
```

- **Titles**: write three candidates, one per hook type, and recommend one. Put the words people search for near the front (Obsidian 插件, 笔记搜索, the feature name) and keep the series' title pattern from `series.md`.
- **Chapters**: YouTube needs at least three, the first at 0:00, each at least 10 s, so a narrated 35 s episode has none. Recorded videos get them from `rec:assemble` ([recorded.md](recorded.md#pipeline)).
- **Hashtags**: YouTube shows up to three next to the title; put them at the end of the description.
- After the package, add the episode to `series.md` and an empty row per platform to `metrics.md`, and remind the user to fill in the row after about 7 days.
