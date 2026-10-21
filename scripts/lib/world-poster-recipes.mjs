// These worlds need a real portrait viewport: a landscape crop loses the
// string anchors or the passing vehicle and listener. Keep this shared by
// capture and derivative generation so batch updates cannot overwrite them.
export const nativePortraitWorldIds = new Set([
  'black-hole-flyby',
  'standing-waves',
  'doppler-effect',
  'silkworm-life',
])

/** Use ordinary controls and pointer input, then freeze a real rendered frame. */
export async function prepareWorldPoster(page, id) {
  if (!nativePortraitWorldIds.has(id)) return false
  if (id === 'black-hole-flyby') {
    // Capture the real near-view lensing state, including a native portrait
    // composition. Never reuse the former catalogue-derived sky poster.
    await page.waitForFunction(() => {
      const frame = document.querySelector('.bh-flyby-frame')
      return frame?.contentWindow?.OneWorldBlackHole
        && frame.contentDocument.querySelector('#cv_loading_bar')?.style.width === '100%'
    })
    await page.evaluate(() => {
      const runtime = document.querySelector('.bh-flyby-frame').contentWindow
      runtime.OneWorldBlackHole.applyScene(0)
      runtime.BlackHoleShaderDemoApp.model.startRadius.setValue(
        window.innerWidth <= 720 ? 30 : 22,
      )
      runtime.BlackHoleShaderDemoApp.model.highDefinition.setValue(true)
      runtime.OneWorldBlackHole.setRocket(false)
      runtime.BlackHoleShaderDemoApp.model.timeScale = 0
      runtime.BlackHoleShaderDemoApp.model.t = 0
    })
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 60_000)
    await page.clock.runFor(80)
    return true
  }
  // Leave enough clock headroom for high-DPI software rendering. pauseAt jumps
  // to this point immediately; it does not add a minute of wall-clock waiting.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 60_000)
  if (id === 'solubility-crystals') {
    // 竖屏默认帧即海报帧：20 ℃ 饱和 KNO₃ 的杯底晶堆、探针与 108.4 g 析出条同框，
    // 自由态直接落定，无需摆帧。
    return true
  }
  if (id === 'mass-conservation') {
    // 海报帧：4P + 5O₂ = 2P₂O₅ 的平衡 idle 态——两侧完整分子阵、原子清点全绿、
    // 天平 284 g = 284 g 同框（组件内 poster() 摆帧 + 冻结）。
    await page.evaluate(() => window.__massConservation?.poster())
    await page.clock.runFor(64)
    return true
  }
  if (id === 'silkworm-life') {
    // 三龄幼虫伏在桑叶上：主角清晰、叶脉与体节可辨，是这部短片最具辨识度的一帧。
    await page.evaluate(() => window.__silkwormLife?.poster(46))
    return true
  }
  if (id === 'anai-mlp') {
    // 同步推进到已收敛的折痕边界（真实前向传播，非摆帧），再走几帧真实渲染让场插值落定。
    await page.evaluate(() => window.__anaiMlp?.poster())
    await page.clock.runFor(1200)
    return true
  }
  if (id === 'anai-neuron') {
    // 已收敛 + 点火定格：绿线、亮核、轴突脉冲中段、树突粒子在途（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiNeuron?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-loss') {
    // 自信的错误定格：真值=1、z=−4.7，交叉熵红墙高耸、错判红环与火花在途、
    // MSE 梯度箭头缩进放大镜（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiLoss?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-backprop') {
    // 落定态定格：青白前向值 + 洋红反向流与全部局部导数同图（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiBackprop?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-embedding') {
    // 成形星图 + 类比箭头完整落点定格（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiEmbedding?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-sequence') {
    // 对比视图 + 间隔 12 + 读完整句：两条热度条一熄一亮、末端定长向量胶囊点亮（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiSequence?.poster())
    await page.clock.runFor(64)
    return true
  }
  if (id === 'anai-conv') {
    // 斜线核停在响应最强的窗口 + 特征图完整显影：山脊光带、镜片乘加火花、Σ 读数（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiConv?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-optimization') {
    // 峡谷四球竞速中段定格：SGD 左壁锯齿、动量长弧越墙、RMSProp/Adam 逼近谷底（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiOptimization?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-attention') {
    // 检索落定态定格：主谓一致句 + are 选中，一行独亮、行内预算读数、混合盘颜色落定（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiAttention?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-transformer') {
    // 整机剖面定格：4 层 2 头、bank 观察顶层、捷径通、PE 条纹亮、预测条落定（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiTransformer?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'anai-generation') {
    // 双主角定格：左侧逐词写出的句子 + 右侧当前步候选分布柱、指针落进概率纸带（组件内 poster() 摆帧）。
    await page.evaluate(() => window.__anaiGeneration?.poster())
    await page.clock.runFor(32)
    return true
  }
  if (id === 'cell-city') {
    // 海报帧：自由态动物细胞全景。教材挂图式剖面本身就是主角，
    // 覆盖层由截图脚本统一隐藏，默认落定帧即可，无需摆帧。
    return true
  }
  if (id === 'photosynthesis') {
    // 海报帧：正午全速——太阳当空、光子流射入基粒、O₂ 气泡上升、糖包在途，
    // 净释氧箭头与两侧细胞器同框（组件内 poster() 摆帧 + 时钟推进让粒子流到达稳态）。
    await page.evaluate(() => window.__photosynthesis?.poster())
    await page.clock.runFor(1800)
    return true
  }
  if (id === 'mendel-genetics') {
    // 海报帧：单因子 Dd × Dd 落定——方格四格点亮、计数柱停在约 3:1、
    // 理论标记与实测柱同框（组件内 poster() 摆帧 + 时钟推进让摆动稳住）。
    await page.evaluate(() => window.__mendelGenetics?.poster())
    await page.clock.runFor(2400)
    return true
  }
  if (id === 'standing-waves') {
    const canvas = page.getByTestId('standing-waves-canvas')
    const bounds = await canvas.boundingBox()
    if (!bounds) throw new Error('Standing-wave canvas is not visible')
    const mobile = bounds.width < 720
    const x = bounds.x + bounds.width * 0.5
    const y = bounds.y + bounds.height * (mobile ? 0.495 : 0.5)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + (mobile ? 45 : 10), y + (mobile ? 42 : 75), { steps: 8 })
    await page.clock.runFor(32)
    await page.mouse.up()
    await page.clock.runFor(120)
  } else {
    await page.getByTestId('doppler-replay').click({ force: true })
    const canvas = page.getByTestId('doppler-stage')
    let progress = 0
    // Select by the scene's actual progress. Slow software renderers may skip
    // callbacks, so elapsed browser time alone is not a reliable composition.
    for (let step = 0; step < 100; step += 1) {
      await page.clock.runFor(100)
      progress = Number(await canvas.getAttribute('data-pass-progress'))
      if (progress >= 0.48 && progress < 0.55) {
        console.log(`[poster] doppler approach at ${progress}`)
        return true
      }
      if (progress >= 0.55) throw new Error('Doppler poster missed its approach frame')
    }
    throw new Error(`Doppler pass did not advance to its poster frame (progress ${progress})`)
  }
  return true
}
