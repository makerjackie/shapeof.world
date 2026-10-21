# CLA execution and records / CLA 签署与存档流程

This procedure applies to every copyrightable external contribution to Shape of
the World, including code, documentation, translations, editorial text,
illustrations, visual design, animation, audio, models, and other media.

本流程适用于《世界的形状》的所有可版权化外部贡献，包括代码、文档、翻译、文案、
插画、视觉设计、动画、音频、模型和其他媒体。

## Agreement recipient / 协议相对方

- 自由维度（深圳）科技有限公司
- 统一社会信用代码：`91440300MAE6GD9168`
- 法定代表人：肖鉴津

## Before accepting a contribution / 合并前

1. Identify whether the relevant rights belong to an individual, an employer,
   or another organization.
2. An individual signs [CLA.md](./CLA.md).
3. An organization signs [CCLA.md](./CCLA.md), and its Authorized Contributors
   sign the Individual CLA when personal or independently owned rights remain.
4. Record the exact agreement version and SHA-256 hash. Material changes create
   a new version and require new acceptance; existing signatures are never
   silently expanded.
5. Verify that the signature covers the contributor identity and any prior PRs
   or commits being accepted.
6. Verify source, license, AI-assistance disclosure, and commercial
   sublicensability for every third-party or mixed element.
7. Only after the maintainer records `CLA verified` may the contribution merge.

1. 先确认相关权利属于个人、雇主还是其他组织。
2. 个人签署 [CLA.md](./CLA.md)。
3. 组织签署 [CCLA.md](./CCLA.md)；如授权贡献者仍拥有个人权利或独立材料，还须签署
   个人 CLA。
4. 记录协议准确版本和 SHA-256；实质修改必须发布新版本并重新接受，不得静默扩大
   既有签署范围。
5. 核对签署身份，以及协议是否覆盖拟接受的既往 PR 或 Commit。
6. 对第三方或混合材料逐项核对来源、许可证、AI 辅助披露和商业再许可能力。
7. 只有维护者记录 `CLA verified` 后才能合并。

## Acceptable execution / 可接受的签署方式

Use one of the following after the Company approves the final agreement version:

- a reliable electronic-signature service that identifies the signer and makes
  later changes to the signed document detectable;
- a handwritten signature or company seal on the complete agreement, returned
  as a single PDF through the private channel designated by the maintainer; or
- another execution method approved in writing by the Company and its counsel.

The Parties agree to electronic execution. A pull-request checkbox, a typed name
in a GitHub comment, or a commit `Signed-off-by` line is useful workflow evidence
but is **not sufficient by itself** for this Project's commercial relicensing
CLA.

在公司批准最终协议版本后，使用以下方式之一：能够识别签署人并发现签后修改的可靠
电子签名服务；在完整协议上手写签名或加盖公司印章并通过维护者指定的私密渠道返回
单一 PDF；或者公司及其律师书面批准的其他方式。双方同意电子签署。PR 勾选框、
GitHub 评论中键入姓名或 Commit 的 `Signed-off-by` 可作为流程证据，但**不能单独
满足**本项目商业再许可 CLA 的签署要求。

## Private records / 私密存档

Store outside the public repository:

- the complete signed agreement;
- identity, authority, and employer approval evidence;
- agreement version, hash, signing method, and signing time;
- covered GitHub accounts, PRs, commits, and prior-Contribution schedules; and
- later notices that affect the contributor's representations.

Do not commit residential addresses, identity-document numbers, private email
addresses, signatures, or company seals. A public registry, if created, should
contain only the contributor's chosen public name, GitHub account, agreement
type, version, and verification date.

Before collecting signature information, provide
[CLA_PRIVACY_NOTICE.md](./CLA_PRIVACY_NOTICE.md) to the signer and retain the
applicable version with the execution record.

完整签署文件、身份及授权证明、版本及哈希、签署方式及时间、覆盖的 GitHub 账号、
PR、Commit 和既往贡献清单，以及影响声明准确性的后续通知，应保存在公开仓库之外。
不得提交住址、身份证件号码、私人邮箱、签名或公司印章。未来如建立公开登记表，只
记录贡献者选择的公开姓名、GitHub 账号、协议类型、版本和核验日期。
收集签署信息前，应向签署人提供
[CLA 个人信息处理告知](./CLA_PRIVACY_NOTICE.md)，并随签署记录保存适用版本。

## Current activation status / 当前启用状态

The templates establish the intended rights model, but must receive qualified
PRC legal review before the first binding execution. Until then, external
copyrightable contributions remain merge-blocked.

本模板已经确立预期权利模型，但首次作为正式合同签署前仍须由具备资质的中国律师
复核。在此之前，外部可版权化贡献继续禁止合并。
