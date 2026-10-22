# 五拍外壳

每个世界都走同样的五拍（问、猜、做、看、懂），这里是它们共用的那一层：一个记住"走到了哪一拍"的 hook，和卡片里的几样东西。五拍本身为什么这样走，见 `../worlds/METHOD.md`。

> **一句话：** 画面和手势是世界自己的，卡片里的东西用外壳的。用户学会一个世界的卡片，就会用所有世界的卡片。

## 谁做什么

- **世界自己做**：活的画面；那一个能动的东西，和画在它旁边的手势提示（"拖我"）；什么时候算"做完了"；顶部问题和底部卡片摆在哪里；实验室里的控件。
- **外壳出**：步骤条；猜卡；"做"的那句提示和拖不动时的退路；"看"的对照字幕和去"懂"的按钮；"懂"的结论卡和下一个问题；走到"懂"时告诉外壳这个世界已经走完。

## 怎么用

### 1. 状态

```tsx
import { BeatResult, BeatSteps, Conclusion, DoHint, GuessCard, useFiveBeats } from '~/components/experiences/five-beat'

const { beat, guess, goto, choose, restart } = useFiveBeats<Guess>(controls)
```

- `beat` 是 `'ask' | 'guess' | 'do' | 'see' | 'know' | 'lab'` 之一。
- 开场先有一段自己会动的镜头，就传 `{ start: 'ask' }`，镜头放完再 `goto('guess')`；画面一出来就让人猜，用默认的 `'guess'`。
- 点选项或"不猜"交给 `choose`，它记下猜测、进"做"。
- "做完了"由世界判断（切完两刀、三颗夸克都上了秤、推够一百多万年），然后 `goto('see')`。
- `goto('know')` 和 `goto('lab')` 会告诉外壳这个世界已经走完，不用再自己调 `controls.finish()`。
- `restart()` 回到开场那一拍、清掉猜测；世界自己的画面要另外复位。
- 动画循环里读 `beatRef.current`，不等 React 重新渲染；要比大小就用 `beatIndex(beat)`（问 0 … 懂 4，实验室 5）。

### 2. 步骤条

放在顶部问题上面：`<BeatSteps beat={beat} />`。到了实验室，五拍都显示走过了，后面亮起"实验室"，每个世界都一样。

### 3. 卡片

世界自己写卡片的容器（位置、背景、`aria-live`），里面按拍放：

| 拍 | 组件 | 要给的东西 |
| --- | --- | --- |
| 猜 | `GuessCard` | `question` 一句问题；`options` 两三个选项；`onChoose`（一般就是 `choose`）；`skip` 不猜也能往下走的那句（"不猜，直接玩"）；想让人直接自由玩，再给 `toLab` |
| 做 | `DoHint` | `hint` 高亮的半句（"把三颗夸克拖到秤上"），`tail` 接着说完；读数放在 children；`fallback` 是拖不动时点一下也能完成的退路（"拖不动？点这里放一颗"），读数要和退路排一行就用 `meter` |
| 看 | `BeatResult` | `verdict` 一句判断（"猜对了"），`right` 决定颜色，`mine` 复述他猜的；世界自己的结果放在 children；`next` 是去"懂"的按钮 |
| 懂 | `Conclusion` | `sentence` 那一句结论；`source` 一行出处；`cta` 是结论下最显眼的按钮（可以没有）；`next` 是下一个问题（`href` 去另一个世界，或 `onClick` 进实验室）；有短片就给 `film`；"再走一遍"这类放在 children |

没猜就别传 `verdict`。小字按钮（再走一遍、直接进博物馆）用 `SkipButton`，和"不猜"长得一样。

一个世界的卡片大概是这样：

```tsx
<div className="xx-card" aria-live="polite">
  {beat === 'guess' && <GuessCard question={tx('先猜一下：……？')} options={options} onChoose={choose} skip={tx('不猜，直接玩')} />}
  {beat === 'do' && <DoHint hint={tx('拖动太阳')} tail={tx('，看彩虹怎么变。')} fallback={{ label: tx('拖不动？点这里'), onClick: nudge }} />}
  {beat === 'see' && (
    <BeatResult verdict={guess && verdictText} right={guess === 'sinks'} mine={mineText} next={{ label: tx('原来如此'), onClick: () => goto('know') }}>
      <p>{tx('太阳越高，彩虹越低。')}</p>
    </BeatResult>
  )}
  {beat === 'know' && (
    <Conclusion sentence={tx('……')} source={tx('出处……')} next={{ href: worldPath(nextId, locale), question: tx('下一个问题') }}>
      <SkipButton onClick={restart}>{tx('再走一遍')}</SkipButton>
    </Conclusion>
  )}
</div>
```

### 4. 文案

- 中英文都要有。文案由世界翻译好再传进来：用 `tx()`（中文写在源码里，英文写进 `src/i18n/experience-en-overrides/<世界>.json`），或者像粒子博物馆那样写成 `[中文, 英文]`。
- 外壳自己只带几句：问、猜、做、看、懂，"实验室"，"五步"，"下一个问题"，"看这个问题的短片"。它们自带英文；世界的英文词典里有同一个中文词，就用世界的。为了各个世界一致，一般不要在世界里另译这几个词。

### 5. 样子

- 外壳的样式读这几个颜色变量：`--beat-ink`、`--beat-muted`、`--beat-accent`、`--beat-good`、`--beat-miss`、`--beat-line`。在世界的根元素上用自己的调色板给它们赋值。
- 字号和间距是大多数世界的样子。哪里要不一样，用世界的根类名盖掉，比如牛的三个选项排一行：`.ca-world .beat-options { grid-template-columns: repeat(3, minmax(0, 1fr)); }`。
- 世界里如果有 `button { font: inherit; color: inherit }` 这类重置，它会盖掉外壳按钮的字号和颜色，要在根类名下重新写一遍。

## 外壳不管的事

- **分享**：外壳顶栏已经有分享，结论卡只要做到截图好看（雨水雕山读结论时把时间停住）。
- **画面上的手势提示**：每个世界的"拖我"长在不同的东西旁边，画在世界自己的画面里。
- **实验室**：每个世界的控件都不一样，世界自己做。

## 例子

- `worlds/cow-anatomy/CowAnatomy.tsx`：一头牛能变成多少肉，拖刀切两刀；下一个问题去人体，实验室是次要按钮。
- `worlds/earth-and-nature/EarthAndNature.tsx`：把地推成山，按住不放；下一个问题去另一个世界。
- `worlds/standard-model/front-door/FrontDoor.tsx`：体重从哪儿来，开场一段镜头（`start: 'ask'`），结论下面接博物馆。
