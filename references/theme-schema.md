# theme 参数 schema 与自然语言映射

`theme_overrides` 是用户自定义的入口。**只接受下列白名单字段**，
其余字段一律忽略——这是为了防止误改不可变字段导致版式崩坏。

## 可覆盖字段

| 字段 | 类型 | 取值范围 | 效果 |
|---|---|---|---|
| `accent` | 色值 | `#rrggbb` | 主色：栏目标题、强调、分隔 |
| `accent_soft` | 色值 | `#rrggbb` | 主色浅底：chip、code 底纹 |
| `ink` | 色值 | `#rrggbb` | 正文色 |
| `muted` | 色值 | `#rrggbb` | 次要信息色（日期、地点） |
| `rule` | 色值 | `#rrggbb` | 分隔线色 |
| `font_scale` | 数字 | 0.7—1.6 | 正文字号倍数，基准 10.5pt |
| `density` | 枚举 | `compact` / `normal` / `relaxed` | 行距与段距 |
| `show_photo` | 布尔 | true / false | 头部是否显示照片 |
| `photo_w` / `photo_h` | 数字 | 12—45（mm） | 头像宽高，`object-fit:cover` 裁切不变形 |
| `photo_radius` | 数字 | 0—20（mm） | 头像圆角 |
| `module_order` | 数组 | 八模块的子集排列 | 模块顺序 |
| `section_style` | 枚举 | `bar` / `underline` / `plain` / `numbered` | 栏目标题样式 |
| `labels` | 对象 | 八模块中文名 | 栏目标题文案 |

`module_order` 里没列出的模块不渲染。可用于「这份简历不要证书模块」这类裁剪。
八模块：`summary` / `skills` / `experience` / `projects` / `education` / `certificates` / `volunteer` / `campus`。

## 自然语言 → 参数映射

| 用户说 | 改什么 |
|---|---|
| 颜色换成深蓝 / 藏青 / 墨绿 | `accent` 对应色值 |
| 颜色太鲜艳 / 稳重一点 | `accent` 降饱和（往灰调） |
| 字太小 / 字大一点 | `font_scale` ±0.05 |
| 太挤了 / 松一点 | `density` 上调一档 |
| 太空 / 紧凑点 | `density` 下调一档 |
| 去掉照片 | `show_photo: false` |
| 技能放最前面 | `module_order` 首位设 `skills` |
| 不要证书那一栏 | `module_order` 去掉 `certificates` |
| 栏目标题改成下划线样式 | `section_style: "underline"` |
| 「专业技能」叫「技术栈」 | `labels.skills = "技术栈"` |
| 底部太空 | 先补内容；仍空则 `density: "relaxed"` |

## 常用色值速查

| 场景 | accent |
|---|---|
| 深蓝（稳重视觉） | `#1e3a5f` |
| 钢蓝（工程感） | `#334e68` |
| 墨绿（沉稳不刻板） | `#1f5c4d` |
| 酒红（庄重） | `#8c2f39` |
| 石墨（极简中性） | `#2b2f36` |
| 靛紫（创意但不轻浮） | `#4c3f91` |

**不要给用户开色轮让 ta 调 RGB。** 给 3 个语义化选项（更稳重 / 更精神 / 更中性），
背后映射到具体色值。

## 边界（不要越界）

- `font_scale` 低于 0.85 时提醒用户「再小 HR 看着累，建议先删内容」
- 一次只改一个维度，改完让用户看效果再改下一个
- 改颜色不动字号，改字号不动顺序——混在一起改，出问题无法归因
