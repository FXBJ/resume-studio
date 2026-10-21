---
name: resume-studio
description: 面向求职者的简历生成与优化 Skill。当用户要求写简历、从零做简历、优化/润色已有简历、按 JD 定制简历、评估简历与岗位匹配度、导出可投递 PDF 时使用。支持引导模式（多轮访谈厘清定位并系统收集信息）与优化模式（接收已有简历做润色、结构化重组与排版），预置六套行业模板，支持颜色、字号、密度等参数化自定义。触发词：写简历、做简历、生成简历、优化简历、润色简历、简历定制、按 JD 改简历、简历匹配度、导出简历 PDF、求职简历。
---

# resume-studio · 简历工坊

给求职者用的简历 Skill。核心主张：**简历是事实的排版，不是文字的创作**。
所有润色只改变结构、顺序、措辞与强调，绝不改变事实本身。

## 模式路由（第一步必做）

| 用户状态 | 模式 | 入口 |
|---|---|---|
| 需求不明确、经历还没成体系、不知道怎么写 | `guided` 引导模式 | `references/guided-interview.md` |
| 已有清晰简历文案或信息，要润色/重组/排版 | `optimize` 优化模式 | `references/optimize-protocol.md` |

判定不清时问一句：「你是想从零聊出一份简历，还是手上已有简历要改好？」不要猜。

## 三条不可逾越的硬约束

1. **不编造。** 输出中出现的每个公司、学校、职位、日期、数字，必须来自用户提供的内容。缺数字时写 `【待补：xxx】` 占位，**不许填一个看起来合理的数**。交付前跑 `check_facts.py` 验证。
2. **不替代人的判断。** 涉及职业选择、薪资、跳槽决策时给信息与选项，不给结论式指令。
3. **患者/客户/雇主敏感信息一律脱敏。** 若用户粘贴的内容含他人隐私，先提醒并改成示例化表述。

## 数据三层分离（架构核心）

```
raw.json          事实清单——只增不删，一次录入终身复用
   │  按 JD 挑选 / 排序 / 侧重（复制，不删除）
   ▼
resume.json       本次投递版本——套模板直接渲染
   │
   ▼
theme             视觉参数——六套行业主题 + 用户覆盖
```

关键规则：**投 B 岗位时从 raw 复制出新的 resume.json，绝不在 raw 上删改**。
raw 是资产，resume 是快照。

## 数据 schema（resume.json）

```json
{
  "meta": {
    "name": "", "headline": "", "photo": "",
    "facts": ["25岁", "4年经验", "本科", "离职-随时到岗"],
    "contact": {"phone":"","email":"","city":"","wechat":"","portfolio":"","github":""},
    "target": {"role":"", "industry":"", "salary":"", "jd_text":""}
  },
  "theme": "tech",
  "theme_overrides": {"accent":"#123456","font_scale":0.95,"show_photo":true,
                      "photo_w":22,"photo_h":30,"photo_radius":2,
                      "labels":{"skills":"技术栈"}},
  "sections": {
    "summary":   [{"text": ""}],
    "skills":    [{"category":"", "items":[""]}],
    "experience":[{"org":"","title":"","team":"","location":"","start":"","end":"",
                   "tags":[""], "bullets":[{"text":"","needs_data":false,"data_hint":""}]}],
    "projects":  [{"title":"","org":"","role":"","stack":"","start":"","end":"","location":"","tags":[],"bullets":[]}],
    "education": [{"school":"","degree":"","major":"","start":"","end":"","location":"","gpa":"","bullets":[]}],
    "certificates":[{"name":"","issuer":"","date":""}],
    "volunteer": [{"name":"","start":"","end":"","duration":"","bullets":[]}],
    "campus":    [{"org":"", "roles":[""]}]
  },
  "fact_sheet": {"companies":[],"schools":[],"metrics":[],"tools":[],"vague_claims":[],"todo":[]}
}
```

字段说明：
- `meta.photo`：本地图片路径或 `data:` URI。**渲染时自动转 base64 内嵌**——写死本地路径的 HTML 一旦被移动、发给别人或另存 PDF 必然裂图。文件不存在时输出 NOTE 并跳过头像，不静默失败。
- `meta.facts`：姓名右侧的关键事实条（年龄 / 经验 / 学历 / 到岗状态），窄屏自动换行。
- `experience.tags` / `projects.tags`：条目下方的能力标签，渲染为 chip。
- `experience.team`：所属团队，渲染在职位后。
- `volunteer`：志愿经历；`campus`：校园经历（紧凑单行）。两者默认排在最后，**空间紧张时最先砍**。

`theme_overrides` 只接受白名单字段（见 `references/theme-schema.md`）：`accent` / `accent_soft` / `ink` / `muted` / `rule` / `font_scale` / `density` / `show_photo` / `photo_w` / `photo_h` / `photo_radius` / `module_order` / `section_style` / `labels`。白名单外的字段一律忽略，防止误改导致版式崩坏。

## 六套行业模板

按**行业大类**分，不按设计风格分——求职者不该猜「投互联网该用哪套」。

| key | 行业 | 模块顺序特点 |
|---|---|---|
| `tech` | 互联网 / 软件 / 技术 | 技能前置，蓝色 |
| `product` | 产品 / 运营 / 市场 | 成果量化前置，绿色 |
| `design` | 设计 / 创意 / 内容 | 作品集优先，可放头像，紫色 |
| `finance` | 金融 / 咨询 / 法律 | 学历与证书前置，衬线，编号栏题 |
| `engineering` | 制造 / 工程 / 医疗 / 基建 | 项目与规范前置，石墨蓝 |
| `public` | 国企 / 事业 / 教育 / 公共部门 | 荣誉证书前置，绛红，庄重 |

```bash
python3 scripts/themes.py list
```

选模板时直接报 key；用户只说行业名就按上表映射。用户要「都看看」时用 `--theme` 各渲染一份再让 ta 挑。

## 脚本（全部零第三方依赖）

| 脚本 | 用途 | 何时跑 |
|---|---|---|
| `themes.py list` | 列出六套模板 | 选模板时 |
| `render.py` | resume.json + theme → 单页 HTML | 每次产出 |
| `lint.py --data x.json` | 反 AI 味 + ATS + 一页估算 | **每次交付前必跑** |
| `check_facts.py --data x.json --raw raw.json` | 无源数字/名称标红 | **每次交付前必跑** |
| `parse_resume.py <文件>` | 已有简历 → 结构化分段 | 优化模式入口 |
| `score.py --data x.json --jd jd.txt` | JD 匹配度 + 差距清单 | 用户问「对口吗」或投递前 |

```bash
# 渲染
python3 scripts/render.py --data resume.json --out resume.html
# 换主题
python3 scripts/render.py --data resume.json --out resume.html --theme finance
# 质检（严格模式：有 ERROR 退出码 1）
python3 scripts/lint.py --data resume.json --strict
```

## 交付标准（缺一不可）

1. HTML 在浏览器打开，**打印 → 存为 PDF**（A4，勾选「背景图形」）即得可投递成品
2. `lint.py` 与 `check_facts.py` 均通过；`【待补】` 项已逐条告知用户
3. 单栏、无表格布局、文字可选中复制——ATS 可解析
4. **页数必须实测，不能靠估。** 有 Chrome 时用无头打印数页：
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
     --no-sandbox --no-pdf-header-footer --print-to-pdf=out.pdf "file://$PWD/resume.html"
   python3 -c "import re;d=open('out.pdf','rb').read();print(len(re.findall(rb'/Type\s*/Page[^s]',d)))"
   ```
   超出时按此顺序处理：① 删与「专业技能」栏重复的技能枚举 bullet ② 砍 `volunteer` / `campus` ③ `font_scale` 每次只降 0.02 ④ 仍不行才接受两页。**不要靠缩字号硬塞**，低于 0.85 就先删内容。
5. 回执给两个链接：编辑态 HTML 路径 + PDF 路径；不要只给一个

### 页高实测技巧

要判断「还差多少才能进一页」，用可变页高探测：给 HTML 追加 `@page{size:210mm Xmm}`，
二分 X 找到能成一页的最小值，即为内容真实高度。比估算可靠得多。

## 常用话术映射（自然语言 → 参数）

| 用户说 | 动作 |
|---|---|
| 「颜色换成深蓝 / 更稳重一点」 | `theme_overrides.accent` 设值 |
| 「字太小 / 太挤」 | `font_scale` +0.05 或 `density` 调松 |
| 「模块顺序调一下，技能放前面」 | 改 `module_order` |
| 「把这段实习加进去」 | 只改 `sections.experience`，不动其他 |
| 「换成金融行业那套」 | `--theme finance` |
| 「底部太空」 | 优先补内容，其次 `density=relaxed` |
| 「针对这份 JD 再出一版」 | 从 raw 复制出新 resume.json，改序与侧重 |

## 明确不做

- 不做算命占卜、性格测试式职业判定
- 不替用户承诺「这样写一定能过」
- 不生成假公司、假职位、假数字、假推荐人
- 不把用户隐私写进任何示例或分享物料
