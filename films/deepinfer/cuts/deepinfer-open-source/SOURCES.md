# 来源与口径

片名：《DeepSeek 这次开源的，到底是什么？》
核对日期：2026-10-20。片子里没有使用厂商的吞吐、延迟或成本数字；唯一的大数字“10,000 个请求”在画面上标了“示意”。

## 一手来源

1. 深度求索公众号文章《DeepSeek 开源推理框架：走向真正普惠的未来》
   https://mp.weixin.qq.com/s/5MEu2eeqNfBWXlkCKTd6sg
   - 开源内部推理框架 DeepInfer，以及 `deepseek-recipe` 编解码组件。
   - 已用 DeepInfer 支撑 DeepSeek V4.1 Flash 的大规模推理服务。
   - 文中说法：降低算力成本、减少能源消耗，支持私有化和公有云部署。

2. `deepseek-ai/DeepInfer` README（Apache-2.0）
   https://github.com/deepseek-ai/DeepInfer
   - 支持模型：DeepSeek-V4.1-Flash。
   - 特性：优化算子与运行时、Attention DP / balanced CP、MoE EP + EPLB、DSpark 与 confidence-scheduled verification（推测解码）、SWA bounded replay、异步调度、batch-invariant inference、确定性采样、结构化输出。
   - 硬件：NVIDIA SM100 GPU、华为昇腾 950 NPU。
   - 这次发布是 **offline inference**；完整服务还需要自备 KV cache 系统、VE/Prefill/Decode 分离、跨数据并行副本的负载均衡。
   - 基于 vLLM 起步，并参考 SGLang、TensorRT-LLM。

3. `deepseek-ai/deepseek-recipe` README（MIT）
   https://github.com/deepseek-ai/deepseek-recipe
   - 把 Messages / Chat Completions / Responses 等 API 请求统一转成 Conversation，渲染成提示词，编码成 token，再把模型输出转回对应协议。
   - 覆盖 V4 / V4.1 的提示词渲染与 token 编解码；V4.1 支持图片输入。
   - 片中的“和官方效果对齐”指请求、提示词、输出解析这一层的一致性，不表示延迟或吞吐与官方 API 相同。

## 概念口径

- **开源**：源代码公开，允许查看、修改、再发布。DeepInfer 用 Apache-2.0，允许商用；`deepseek-recipe` 用 MIT。开源不等于免费提供算力或服务。
- **模型 vs 推理框架**：模型是权重和结构；推理框架负责把请求调度到显卡/加速卡上、管理显存与批处理、把 token 流式返回。片中用“大脑 / 调度系统”作比喻。
- **token**：模型处理和生成文本的最小单位，不完全等于“一个字”。片中的切分画面标了“仅为示意”。

## 片子刻意没说的话

- 没有声称 DeepInfer 比 vLLM、SGLang 或 TensorRT-LLM 更快。README 里的性能图是厂商自测，片中没有引用具体倍数。
- 没有把“开源”说成“免费”。片中专门用一段说明：代码可以免费，显卡和电还是要钱。
- 没有把 DeepInfer 说成“装好就能用的 AI 产品”。README 明确列出还缺的组件，片中照实说。
- “10,000 个请求”是帮助理解的示意，不是任何真实服务的并发数据。
