/* ==========================================================================
   简历工坊 · Resume Studio — 应用逻辑
   纯前端、零依赖。数据只存 localStorage，不上传任何服务器。
   渲染规则与 scripts/render.py 保持一致：单栏、无表格、纯文字流、A4。
   ========================================================================== */
'use strict';

/* ============================== 1. 主题系统 ============================== */

const THEMES = {
  tech: {
    label: '互联网 / 技术', accent: '#0f62fe', accentSoft: '#e8f0ff',
    ink: '#16181d', muted: '#5c6470', rule: '#d8dce3',
    font: '-apple-system,"PingFang SC","STHeiti","Noto Sans CJK SC","Microsoft YaHei",sans-serif',
    fontScale: 1, density: 'normal',
    moduleOrder: ['summary','skills','experience','projects','education','certificates','volunteer','campus'],
    sectionStyle: 'bar', showPhoto: true, photoW: 22, photoH: 30, photoRadius: 2,
    notes: '技能前置，蓝色主色，工程岗与研发岗通用。'
  },
  product: {
    label: '产品 / 运营', accent: '#0e9f6e', accentSoft: '#e6f6f0',
    ink: '#16181d', muted: '#5c6470', rule: '#d8dce3',
    font: '-apple-system,"PingFang SC","STHeiti","Noto Sans CJK SC","Microsoft YaHei",sans-serif',
    fontScale: 1, density: 'normal',
    moduleOrder: ['summary','experience','projects','skills','education','certificates','volunteer','campus'],
    sectionStyle: 'underline', showPhoto: true, photoW: 22, photoH: 30, photoRadius: 2,
    notes: '成果量化前置，绿色主色，适合产品、运营、增长、市场岗。'
  },
  design: {
    label: '设计 / 创意', accent: '#7c5cff', accentSoft: '#f0ebff',
    ink: '#16181d', muted: '#5c6470', rule: '#d8dce3',
    font: '-apple-system,"PingFang SC","STHeiti","Noto Sans CJK SC","Microsoft YaHei",sans-serif',
    fontScale: 1, density: 'relaxed',
    moduleOrder: ['summary','projects','experience','skills','education','certificates','volunteer','campus'],
    sectionStyle: 'plain', showPhoto: true, photoW: 26, photoH: 34, photoRadius: 2,
    notes: '作品集优先，留白舒展，可放头像，适合设计、创意、内容岗。'
  },
  finance: {
    label: '金融 / 咨询', accent: '#8a6d3b', accentSoft: '#f7f1e6',
    ink: '#16181d', muted: '#5c6470', rule: '#d8dce3',
    font: '"Songti SC","Noto Serif CJK SC","STSong",Georgia,serif',
    fontScale: 1, density: 'normal',
    moduleOrder: ['summary','education','experience','certificates','skills','projects','volunteer','campus'],
    sectionStyle: 'numbered', showPhoto: false, photoW: 22, photoH: 30, photoRadius: 2,
    notes: '学历与证书前置，衬线字体，编号栏题，贴合金融咨询法律行业惯例。'
  },
  engineering: {
    label: '制造 / 工程 / 医疗', accent: '#334e68', accentSoft: '#e8eef4',
    ink: '#16181d', muted: '#5c6470', rule: '#d8dce3',
    font: '-apple-system,"PingFang SC","STHeiti","Noto Sans CJK SC","Microsoft YaHei",sans-serif',
    fontScale: 1, density: 'normal',
    moduleOrder: ['summary','experience','projects','education','certificates','skills','volunteer','campus'],
    sectionStyle: 'bar', showPhoto: true, photoW: 22, photoH: 30, photoRadius: 2,
    notes: '项目与技术规范前置，石墨蓝主色，适合制造、工程、医疗、基建岗。'
  },
  public: {
    label: '国企 / 事业 / 教育', accent: '#9b1c31', accentSoft: '#fbeaec',
    ink: '#16181d', muted: '#5c6470', rule: '#d8dce3',
    font: '"Songti SC","Noto Serif CJK SC","STSong",Georgia,serif',
    fontScale: 1.02, density: 'normal',
    moduleOrder: ['summary','education','experience','certificates','skills','projects','volunteer','campus'],
    sectionStyle: 'bar', showPhoto: true, photoW: 22, photoH: 30, photoRadius: 2,
    notes: '荣誉与证书前置，绛红主色，庄重规范，适合国企、事业、教育、公共部门。'
  }
};

const SECTION_LABELS = {
  summary: '个人简介', skills: '专业技能', experience: '工作经历',
  projects: '项目经历', education: '教育背景', certificates: '证书与荣誉',
  volunteer: '志愿经历', campus: '校园经历'
};

const MODULE_KEYS = Object.keys(SECTION_LABELS);
const BASE_FONT_PT = 10.5;
const DENSITY = {
  compact:  { lh: 1.45, gapPara: '4px',  gapSec: '10px', gapEntry: '5px'  },
  normal:   { lh: 1.62, gapPara: '7px',  gapSec: '14px', gapEntry: '8px'  },
  relaxed:  { lh: 1.80, gapPara: '10px', gapSec: '18px', gapEntry: '12px' }
};

/* ============================== 2. 体检规则 ============================== */
/* 与 scripts/lint.py 保持同步：改一边必须改另一边。 */

const AI_CLICHES = [
  '深耕','赋能','闭环','抓手','颗粒度','打法','链路','沉淀','对标','复盘','拉通','落地','推进','打磨',
  '构建了完善的','全方位的','一体化的','高效的','积极的','较强的','良好的沟通能力','团队协作精神',
  '抗压能力强','学习能力强','快速学习','锐意进取','脚踏实地','严谨认真','主人翁','结果导向','数据驱动',
  '持续优化','深度融合','全方位提升','显著提升','极大提升','有效提升','成功落地','顺利推进'
];
const EMPTY_ADJ = ['优秀','出色','良好','专业','丰富','深入','扎实','熟练'];
const STRONG_VERBS = [
  '设计','实现','搭建','重构','主导','独立','完成','交付','上线','优化','降低','提升','缩短','减少',
  '节省','复现','定位','修复','推动','建立','制定','支撑','覆盖','从零','负责','牵头','协调','输出','验证'
];
const SKILL_LEAD = /^(熟练掌握|熟悉掌握|熟悉|精通|掌握|擅长|轮转|参与轮转)/;
const RE_NUM = /\d/;
const RE_ING = /(ing|ING)$/;

function isSkillEnum(t) { return (t.split('、').length - 1) >= 2 || (t.split('，').length - 1) >= 3; }

/* ============================== 3. 工具函数 ============================== */

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function inlineMd(t) {
  let s = esc(t);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}
function fmtRange(a, b) {
  const s = (a || '').trim();
  const e = (b || '').trim() || '至今';
  if (!s && !e) return '';
  if (!s) return e;
  return s + ' — ' + e;
}
function uid() { return 'i' + Math.random().toString(36).slice(2, 9); }
function debounce(fn, ms) {
  let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); };
}

/* ============================== 4. 状态 ============================== */

const STORE_KEY = 'resume-studio.v1';

function blankState() {
  return {
    meta: {
      name: '', headline: '', photo: '',
      facts: [],
      contact: { phone: '', email: '', city: '', wechat: '', portfolio: '', github: '' },
      target: { role: '', industry: '', salary: '' }
    },
    theme: 'tech',
    overrides: { accent: '', fontScale: 1, density: '', sectionStyle: '', showPhoto: true,
                 photoW: 22, photoH: 30, photoRadius: 2, moduleOrder: [], labels: {} },
    sections: {
      summary: [], skills: [], experience: [], projects: [],
      education: [], certificates: [], volunteer: [], campus: []
    }
  };
}

const SAMPLE = {
  meta: {
    name: '张示例', headline: '前端开发工程师', photo: '',
    facts: ['25岁', '4年经验', '本科', '离职-随时到岗'],
    contact: { phone: '138****0000', email: 'zhang@example.com', city: '上海',
               wechat: '', portfolio: '', github: 'github.com/zhang-example' },
    target: { role: '高级前端开发工程师', industry: '互联网', salary: '' }
  },
  theme: 'tech',
  overrides: { accent: '', fontScale: 1, density: '', sectionStyle: '', showPhoto: true,
               photoW: 22, photoH: 30, photoRadius: 2, moduleOrder: [], labels: {} },
  sections: {
    summary: [{ text: '3 年 B 端前端经验，专注复杂表单与数据可视化场景。主导过 2 个从零到一的后台系统，最大单应用日活 4 万。' }],
    skills: [
      { category: '前端', items: ['React', 'TypeScript', 'Vite', 'TailwindCSS'] },
      { category: '工程化', items: ['Webpack', 'CI/CD', '单元测试'] },
      { category: '后端协同', items: ['Node.js', 'Redis', 'REST/GraphQL'] }
    ],
    experience: [
      { org: '某互联网公司', title: '前端开发工程师', team: '', location: '上海',
        start: '2024.03', end: '', tags: ['Web 前端', '数据可视化'],
        bullets: [
          { text: '用 Redis 缓存重构订单查询接口，P99 从 800ms 降到 120ms' },
          { text: '主导数据看板从零到一，支撑 12 个业务方的日常决策' },
          { text: '搭建前端监控体系，线上问题定位时间从 2 小时缩短到 20 分钟' }
        ] },
      { org: '某创业公司', title: '前端开发实习生', team: '', location: '上海',
        start: '2022.09', end: '2026.06', tags: ['H5', '营销活动'],
        bullets: [{ text: '独立完成 3 个营销活动页，最高单页 PV 8 万' }] }
    ],
    projects: [
      { title: '运营数据看板', org: '某互联网公司', role: '前端负责人',
        stack: 'React + TypeScript + ECharts', start: '2025.07', end: '2025.12',
        location: '', tags: [],
        bullets: [
          { text: '设计 14 个可配置看板模板，业务方自助配置覆盖率 70%' },
          { text: '首屏加载耗时下降 40%' }
        ] }
    ],
    education: [
      { school: '上海某大学', degree: '本科', major: '计算机科学与技术',
        start: '2022.09', end: '2026.06', location: '上海', gpa: '3.6/4.0', bullets: [] }
    ],
    certificates: [
      { name: '大学英语六级', issuer: '教育部考试中心', date: '2024.06' }
    ],
    volunteer: [
      { name: '开源社区志愿者', start: '2023.03', end: '2023.09', duration: '6 个月',
        bullets: [{ text: '维护项目文档站，累计合并 40+ 个社区 PR' }] }
    ],
    campus: [{ org: '', roles: ['班级纪律委员', '院系学生会宣传部部长'] }]
  }
};

let state = blankState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    // 合并，防止旧版本缺字段
    const base = blankState();
    state = Object.assign(base, saved);
    state.meta = Object.assign(base.meta, saved.meta || {});
    state.meta.contact = Object.assign(base.meta.contact, (saved.meta || {}).contact || {});
    state.meta.target = Object.assign(base.meta.target, (saved.meta || {}).target || {});
    state.overrides = Object.assign(base.overrides, saved.overrides || {});
    state.sections = Object.assign(base.sections, saved.sections || {});
  } catch (e) {
    console.warn('读取本地存档失败，使用空白状态', e);
  }
}

const saveState = debounce(function () {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    // 头像 base64 可能超出配额，静默降级：去掉头像再存
    try {
      const slim = JSON.parse(JSON.stringify(state));
      slim.meta.photo = '';
      localStorage.setItem(STORE_KEY, JSON.stringify(slim));
    } catch (_) { /* 放弃持久化，不影响使用 */ }
  }
}, 400);

/* ============================== 5. 主题合并 ============================== */

const OVERRIDABLE = ['accent','accentSoft','ink','muted','rule','fontScale','density',
                     'sectionStyle','showPhoto','photoW','photoH','photoRadius','moduleOrder','labels'];

function resolveTheme() {
  const t = THEMES[state.theme] || THEMES.tech;
  const out = Object.assign({}, t, { key: state.theme });
  out.labels = Object.assign({}, SECTION_LABELS);

  const ov = state.overrides || {};
  OVERRIDABLE.forEach(k => {
    if (ov[k] === '' || ov[k] === null || ov[k] === undefined) return;
    if (k === 'labels') { Object.assign(out.labels, ov.labels || {}); return; }
    out[k] = ov[k];
  });

  // 显式换主题时清掉从上一主题继承的配色，否则用户会觉得「换了模板但没变化」
  if (out._switched) {
    ['accent','accentSoft','ink','muted','rule','sectionStyle'].forEach(k => {
      if (ov[k]) { delete ov[k]; out[k] = t[k]; }
    });
    out._switched = false;
  }

  if (!out.moduleOrder || !out.moduleOrder.length) out.moduleOrder = t.moduleOrder.slice();
  out.moduleOrder = out.moduleOrder.filter(m => MODULE_KEYS.indexOf(m) >= 0);
  return out;
}

/* ============================== 6. 简历渲染 ============================== */

function spans(items, cls) {
  return items.map(v => '<span class="' + cls + '">' + esc(v) + '</span>').join('');
}

function tagsHtml(tags) {
  const items = (tags || []).map(t => String(t).trim()).filter(Boolean);
  if (!items.length) return '';
  return '<div class="tags">' + spans(items, 'tag') + '</div>';
}

function bulletsHtml(bullets) {
  const items = (bullets || []).filter(Boolean);
  if (!items.length) return '';
  return '<ul class="bullets">' + items.map(b => {
    const text = (b && typeof b === 'object') ? (b.text || '') : String(b);
    if (b && b.needs_data) {
      return '<li class="needs-data">' + inlineMd(text) +
             '<span class="todo">【待补：' + esc(b.data_hint || '补充具体数字') + '】</span></li>';
    }
    return '<li>' + inlineMd(text) + '</li>';
  }).join('') + '</ul>';
}

function entryBlock(org, title, metaLine, bullets, location, extra, tags) {
  let head = '<div class="e-head"><span class="e-title">' + esc(title) + '</span>';
  if (org) head += '<span class="e-org">' + esc(org) + '</span>';
  if (extra) head += '<span class="e-extra">' + esc(extra) + '</span>';
  head += '</div>';
  let sub = '';
  if (metaLine || location) {
    sub = '<div class="e-sub"><span>' + esc(metaLine) + '</span>' +
          '<span class="e-loc">' + esc(location || '') + '</span></div>';
  }
  return '<div class="entry">' + head + sub + bulletsHtml(bullets) + tagsHtml(tags) + '</div>';
}

const R = {
  summary(s, t) {
    const texts = (s.summary || []).map(i => (i && i.text) || '').filter(x => x.trim());
    if (!texts.length) return '';
    return '<section class="sec"><h2>' + esc(t.labels.summary) + '</h2>' +
           '<p class="summary">' + texts.map(inlineMd).join('<br>') + '</p></section>';
  },
  skills(s, t) {
    const rows = (s.skills || []).map(it => {
      const vals = (it.items || []).map(v => String(v).trim()).filter(Boolean);
      if (!vals.length) return '';
      const cat = (it.category || '').trim();
      return '<div class="sk-row">' +
        (cat ? '<span class="sk-cat">' + esc(cat) + '</span>' : '') +
        '<span class="sk-items">' + spans(vals, 'chip') + '</span></div>';
    }).filter(Boolean).join('');
    if (!rows) return '';
    return '<section class="sec"><h2>' + esc(t.labels.skills) + '</h2>' + rows + '</section>';
  },
  experience(s, t) {
    const blocks = (s.experience || []).map(it => entryBlock(
      it.org, it.title, fmtRange(it.start, it.end), it.bullets, it.location, it.team, it.tags
    )).join('');
    if (!blocks) return '';
    return '<section class="sec"><h2>' + esc(t.labels.experience) + '</h2>' + blocks + '</section>';
  },
  projects(s, t) {
    const blocks = (s.projects || []).map(it => {
      const bits = [];
      if ((it.role || '').trim()) bits.push('角色：' + it.role.trim());
      if ((it.stack || '').trim()) bits.push('技术栈：' + it.stack.trim());
      return entryBlock(it.org, it.title, fmtRange(it.start, it.end), it.bullets,
                        it.location, bits.join(' · '), it.tags);
    }).join('');
    if (!blocks) return '';
    return '<section class="sec"><h2>' + esc(t.labels.projects) + '</h2>' + blocks + '</section>';
  },
  education(s, t) {
    const blocks = (s.education || []).map(it => {
      const bits = [];
      if ((it.degree || '').trim()) bits.push(it.degree.trim());
      if ((it.major || '').trim()) bits.push(it.major.trim());
      if ((it.gpa || '').trim()) bits.push('GPA ' + it.gpa.trim());
      return entryBlock(it.school, it.degree || it.major, fmtRange(it.start, it.end),
                        it.bullets, it.location, bits.join(' · '), null);
    }).join('');
    if (!blocks) return '';
    return '<section class="sec"><h2>' + esc(t.labels.education) + '</h2>' + blocks + '</section>';
  },
  certificates(s, t) {
    const lis = (s.certificates || []).map(it => {
      const name = (it.name || '').trim();
      if (!name) return '';
      const bits = ['<strong>' + esc(name) + '</strong>'];
      if ((it.issuer || '').trim()) bits.push(esc(it.issuer.trim()));
      if ((it.date || '').trim()) bits.push(esc(it.date.trim()));
      return '<li>' + bits.join(' · ') + '</li>';
    }).filter(Boolean).join('');
    if (!lis) return '';
    return '<section class="sec"><h2>' + esc(t.labels.certificates) + '</h2>' +
           '<ul class="plain-list">' + lis + '</ul></section>';
  },
  volunteer(s, t) {
    const blocks = (s.volunteer || []).map(it => {
      const name = (it.name || '').trim();
      if (!name) return '';
      const bits = [];
      if ((it.duration || '').trim()) bits.push('时长 ' + it.duration.trim());
      return entryBlock('', name, fmtRange(it.start, it.end), it.bullets, '', bits.join(' · '), null);
    }).filter(Boolean).join('');
    if (!blocks) return '';
    return '<section class="sec"><h2>' + esc(t.labels.volunteer) + '</h2>' + blocks + '</section>';
  },
  campus(s, t) {
    const rows = (s.campus || []).map(it => {
      if (typeof it === 'string') return it.trim() ? '<li>' + inlineMd(it) + '</li>' : '';
      const org = (it.org || '').trim();
      const roles = (it.roles || []).map(r => String(r).trim()).filter(Boolean);
      if (!org && !roles.length) return '';
      const head = (org ? esc(org) : '') +
        (roles.length ? '<span class="c-roles">' + roles.map(esc).join(' · ') + '</span>' : '');
      return '<li>' + head + '</li>';
    }).filter(Boolean).join('');
    if (!rows) return '';
    return '<section class="sec"><h2>' + esc(t.labels.campus) + '</h2>' +
           '<ul class="plain-list tight">' + rows + '</ul></section>';
  }
};

function buildCSS(t) {
  const fs = (BASE_FONT_PT * (t.fontScale || 1)).toFixed(2);
  const d = DENSITY[t.density] || DENSITY.normal;
  const st = t.sectionStyle || 'bar';

  let h2;
  if (st === 'bar') {
    h2 = 'background:' + t.accent + ';color:#fff;padding:2.5px 8px;border-radius:2px;display:inline-block;';
  } else if (st === 'underline') {
    h2 = 'color:' + t.accent + ';border-bottom:1.5px solid ' + t.accent + ';padding-bottom:2px;display:block;';
  } else if (st === 'numbered') {
    h2 = 'color:' + t.accent + ';border-bottom:1px solid ' + t.rule + ';padding-bottom:2px;';
  } else {
    h2 = 'color:' + t.ink + ';letter-spacing:.14em;text-transform:uppercase;';
  }
  const counter = (st === 'numbered')
    ? '.sec{counter-increment:sec}.sec>h2::before{content:counter(sec,decimal-leading-zero)". ";color:' + t.muted + ';}'
    : '';

  return [
    ':root{--accent:' + t.accent + ';--accent-soft:' + t.accentSoft + ';--ink:' + t.ink +
      ';--muted:' + t.muted + ';--rule:' + t.rule + ';--fs:' + fs + 'pt;--lh:' + d.lh + ';}',
    '*{box-sizing:border-box;}',
    'html,body{margin:0;padding:0;background:#fff;}',
    'body{font-family:' + t.font + ';font-size:var(--fs);line-height:var(--lh);color:var(--ink);-webkit-font-smoothing:antialiased;}',
    '@page{size:A4;margin:0;}',
    '.page{width:210mm;min-height:297mm;margin:0 auto;padding:16mm 17mm 14mm;background:#fff;}',
    counter,
    '.hd{display:flex;gap:13px;align-items:flex-start;padding-bottom:' + d.gapSec + ';border-bottom:2px solid var(--accent);}',
    '.photo{width:' + (t.photoW || 22) + 'mm;height:' + (t.photoH || 30) + 'mm;object-fit:cover;' +
      'border-radius:' + (t.photoRadius || 0) + 'mm;flex:none;background:var(--accent-soft);}',
    '.hd-main{flex:1;min-width:0;}',
    '.hd-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;}',
    '.name{font-size:calc(var(--fs)*2.05);font-weight:700;margin:0;letter-spacing:.02em;line-height:1.1;}',
    '.facts{display:flex;flex-wrap:wrap;gap:2px 8px;font-size:calc(var(--fs)*0.9);color:var(--muted);}',
    '.fact{white-space:nowrap;}',
    '.fact + .fact::before{content:"·";margin-right:8px;color:var(--rule);}',
    '.headline{font-size:calc(var(--fs)*1.12);color:var(--accent);font-weight:600;margin:4px 0 3px;}',
    '.target{font-size:calc(var(--fs)*0.94);color:var(--muted);margin:0 0 4px;}',
    '.t-label{color:var(--accent);font-weight:600;margin-right:4px;}',
    '.contact{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:calc(var(--fs)*0.92);color:var(--muted);}',
    '.sec{margin-top:' + d.gapSec + ';counter-increment:sec;}',
    '.sec>h2{font-size:calc(var(--fs)*1.06);font-weight:700;margin:0 0 ' + d.gapPara + ';' + h2 + '}',
    '.summary{margin:0;text-align:justify;}',
    '.entry{margin-bottom:' + d.gapEntry + ';}',
    '.entry:last-child{margin-bottom:0;}',
    '.e-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;}',
    '.e-title{font-weight:700;font-size:calc(var(--fs)*1.03);}',
    '.e-org{color:var(--accent);font-weight:600;}',
    '.e-extra{color:var(--muted);font-size:calc(var(--fs)*0.9);}',
    '.e-sub{color:var(--muted);font-size:calc(var(--fs)*0.88);margin-top:1px;display:flex;justify-content:space-between;gap:10px;}',
    '.e-loc{color:var(--muted);font-size:calc(var(--fs)*0.88);flex:none;}',
    '.tags{display:flex;flex-wrap:wrap;gap:3px 5px;margin-top:3px;}',
    '.tag{background:var(--accent-soft);color:var(--ink);border-radius:2px;padding:0 5px;font-size:calc(var(--fs)*0.85);}',
    '.bullets{margin:3px 0 0;padding-left:1.15em;}',
    '.bullets li{margin-bottom:2px;text-align:justify;}',
    '.bullets li:last-child{margin-bottom:0;}',
    '.plain-list{margin:0;padding-left:1.15em;}',
    '.plain-list li{margin-bottom:2px;}',
    '.plain-list.tight li{margin-bottom:1px;}',
    '.c-roles{color:var(--muted);}',
    'code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.94em;background:var(--accent-soft);padding:0 3px;border-radius:2px;}',
    '.sk-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 10px;margin-bottom:3px;}',
    '.sk-row:last-child{margin-bottom:0;}',
    '.sk-cat{font-weight:600;min-width:64px;color:var(--ink);}',
    '.sk-items{display:flex;flex-wrap:wrap;gap:3px 5px;}',
    '.chip{background:var(--accent-soft);color:var(--ink);border-radius:2px;padding:0 5px;font-size:calc(var(--fs)*0.92);}',
    '.needs-data{list-style:none;margin-left:-1.15em;}',
    '.todo{display:inline-block;margin-left:4px;padding:0 5px;border-radius:2px;background:#fff4e5;color:#b25e00;border:1px dashed #e8a33d;font-size:calc(var(--fs)*0.85);}',
    '@media print{body{background:#fff;}.page{width:auto;min-height:0;padding:0;}.needs-data,.entry,.sec{break-inside:avoid;}}'
  ].join('\n');
}

function buildResumeHTML() {
  const t = resolveTheme();
  const m = state.meta;
  const s = state.sections;

  // 头部
  let photo = '';
  if (t.showPhoto && m.photo) {
    photo = '<img class="photo" src="' + m.photo + '" alt="">';
  }
  const facts = (m.facts || []).map(f => String(f).trim()).filter(Boolean);
  const factsHtml = facts.length
    ? '<div class="facts">' + spans(facts, 'fact') + '</div>' : '';

  const c = m.contact || {};
  const cParts = ['phone','email','city','wechat','portfolio','github']
    .map(k => (c[k] || '').trim()).filter(Boolean)
    .map(v => '<span class="c-item">' + esc(v) + '</span>').join('');

  const tg = m.target || {};
  const tBits = [];
  if ((tg.role || '').trim()) tBits.push('<b>' + esc(tg.role.trim()) + '</b>');
  if ((tg.industry || '').trim()) tBits.push(esc(tg.industry.trim()));
  if ((tg.salary || '').trim()) tBits.push(esc(tg.salary.trim()));
  const tLine = tBits.length
    ? '<div class="target"><span class="t-label">求职意向</span>' + tBits.join(' · ') + '</div>' : '';

  const header =
    '<header class="hd">' + photo +
    '<div class="hd-main">' +
      '<div class="hd-top"><h1 class="name">' + esc(m.name || '你的名字') + '</h1>' + factsHtml + '</div>' +
      ((m.headline || '').trim() ? '<div class="headline">' + esc(m.headline.trim()) + '</div>' : '') +
      tLine +
      '<div class="contact">' + cParts + '</div>' +
    '</div></header>';

  const parts = [header];
  (t.moduleOrder || []).forEach(k => {
    if (!s[k] || !s[k].length) return;
    const out = R[k] ? R[k](s, t) : '';
    if (out) parts.push(out);
  });

  const css = buildCSS(t);
  const name = (m.name || '简历').trim();
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<title>' + esc(name) + ' · 简历</title><style>' + css + '</style></head><body>' +
    '<div class="page">' + parts.join('\n') + '</div></body></html>';
}

/* ============================== 7. 体检引擎 ============================== */

function runLint() {
  const findings = [];
  const s = state.sections;
  const bullets = [];

  ['experience','projects','education','volunteer'].forEach(key => {
    (s[key] || []).forEach(e => {
      const who = e.title || e.org || e.school || e.name || '?';
      (e.bullets || []).forEach(b => {
        const text = (b && typeof b === 'object') ? (b.text || '') : String(b || '');
        bullets.push({ sec: key, who: String(who), text: text.trim() });
      });
    });
  });
  (s.summary || []).forEach(x => {
    const text = (x && x.text) || '';
    if (text.trim()) bullets.push({ sec: 'summary', who: '(简介)', text: text.trim() });
  });

  const total = bullets.length;
  let noNum = 0, hasVerb = 0;
  const lengths = [];

  bullets.forEach(b => {
    const t = b.text;
    if (!t) return;
    lengths.push(t.length);

    const hits = AI_CLICHES.filter(w => t.indexOf(w) >= 0);
    if (hits.length) {
      findings.push({ level: 'warn', where: b.sec + '/' + b.who, rule: 'AI 套话',
        detail: '命中 ' + hits.join('、'),
        fix: '换成具体动作 + 数字，或整句删除' });
    }
    if (t.indexOf('——') >= 0) {
      findings.push({ level: 'warn', where: b.sec + '/' + b.who, rule: '破折号',
        detail: 'bullet 内含「——」', fix: '拆成两句，或用逗号 / 分号' });
    }
    if (RE_ING.test(t.replace(/[。；;，,]/g, ''))) {
      findings.push({ level: 'warn', where: b.sec + '/' + b.who, rule: '进行时结尾',
        detail: '以 -ing 结尾，AI 味重', fix: '改为已完成的动作' });
    }
    if (!SKILL_LEAD.test(t)) {
      EMPTY_ADJ.forEach(adj => {
        if (t.indexOf(adj) >= 0 && !RE_NUM.test(t)) {
          findings.push({ level: 'warn', where: b.sec + '/' + b.who, rule: '空洞形容词',
            detail: '「' + adj + '」无数字支撑', fix: '补一个可核验的数字，或删掉该形容词' });
        }
      });
    }
    if (!RE_NUM.test(t) && t.indexOf('【待补') !== 0 && !isSkillEnum(t)) noNum++;
    if (STRONG_VERBS.some(v => t.indexOf(v) >= 0)) hasVerb++;
  });

  if (lengths.length >= 4) {
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const varc = Math.sqrt(lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length) / avg;
    if (varc < 0.18) {
      findings.push({ level: 'warn', where: '全局', rule: 'bullet 长度过于均匀',
        detail: '变异系数 ' + varc.toFixed(2) + '（<0.18 判定为 AI 痕迹）',
        fix: '让重点条目更长、次要条目更短，形成真实节奏' });
    }
  }

  if (total) {
    const nr = noNum / total;
    if (nr > 0.5) {
      findings.push({ level: 'warn', where: '全局', rule: '证据密度不足',
        detail: noNum + '/' + total + ' 条 bullet 无任何数字（' + Math.round(nr * 100) + '%）',
        fix: '优先给最近两段经历补数字；没有数字的写清交付物与范围' });
    }
    const vr = hasVerb / total;
    if (vr < 0.5) {
      findings.push({ level: 'warn', where: '全局', rule: '强动词覆盖低',
        detail: '仅 ' + Math.round(vr * 100) + '% 的 bullet 以强动词开头',
        fix: '用「设计 / 搭建 / 主导 / 优化 / 降低」开头，替换「参与 / 负责 / 协助」' });
    }
  }

  const totalChars = bullets.reduce((a, b) => a + b.text.length, 0);
  if (totalChars > 2600) {
    findings.push({ level: 'warn', where: '全局', rule: '可能超一页',
      detail: 'bullet 总字符 ' + totalChars + '（>2600 有溢出风险）',
      fix: '删最旧经历的次要条目，或把字号降到 92%' });
  }

  return {
    findings,
    total,
    noNumberRatio: total ? noNum / total : 0,
    strongVerbRatio: total ? hasVerb / total : 0,
    totalChars
  };
}

/* ============================== 8. 渲染：体检面板 ============================== */

function renderLint() {
  const r = runLint();
  const root = document.getElementById('lint-root');
  const warns = r.findings.filter(f => f.level === 'warn').length;
  const errs = r.findings.filter(f => f.level === 'error').length;

  const badge = document.getElementById('lint-badge');
  if (warns + errs > 0) { badge.hidden = false; badge.textContent = String(warns + errs); }
  else { badge.hidden = true; }

  const statCls = n => n === 0 ? 'is-ok' : (n <= 3 ? 'is-warn' : 'is-err');
  let html =
    '<div class="lint-summary">' +
      '<div class="lint-stat ' + statCls(warns + errs) + '"><b>' + (warns + errs) + '</b><span>待处理</span></div>' +
      '<div class="lint-stat ' + statCls(Math.round(r.noNumberRatio * 10)) + '"><b>' +
        Math.round(r.noNumberRatio * 100) + '%</b><span>无数字</span></div>' +
      '<div class="lint-stat ' + statCls(Math.round((1 - r.strongVerbRatio) * 10)) + '"><b>' +
        Math.round(r.strongVerbRatio * 100) + '%</b><span>强动词</span></div>' +
    '</div>';

  if (!r.findings.length) {
    html += '<div class="lint-empty"><span class="big">✓</span>' +
      '<p>没有检出 AI 味或无据数字。<br>共 ' + r.total + ' 条 bullet，' + r.totalChars + ' 字符。</p></div>';
  } else {
    html += r.findings.map(f =>
      '<div class="lint-item ' + f.level + '">' +
        '<div class="li-rule">' + esc(f.rule) + '</div>' +
        '<div class="li-where">' + esc(f.where) + '</div>' +
        '<div class="li-detail">' + esc(f.detail) + '</div>' +
        '<div class="li-fix">→ ' + esc(f.fix) + '</div>' +
      '</div>').join('');
  }

  html += '<div class="lint-note"><b>体检不替代你的判断。</b>医疗、法务、财务等专业简历的' +
    '技能清单靠覆盖面取信，本工具对「熟练掌握 X、Y、Z」这类枚举不强制要求每条配数字；' +
    '其余 bullet 仍建议补可核验的指标。</div>';

  root.innerHTML = html;
}

/* ============================== 9. 渲染：表单 ============================== */

function field(label, ctrl, val) {
  return '<label class="field"><span class="f-label">' + label + (val ? ' <b>' + val + '</b>' : '') +
    '</span><span class="f-ctrl">' + ctrl + '</span></label>';
}
function txt(path, ph, extra) {
  return '<input class="input ' + (extra || '') + '" data-bind="' + path + '" placeholder="' + esc(ph) + '" spellcheck="false">';
}
function num(path, ph) {
  return '<input class="input input-mono" type="number" data-bind="' + path + '" placeholder="' + esc(ph) + '">';
}
function area(path, ph) {
  return '<textarea class="input" data-bind="' + path + '" placeholder="' + esc(ph) + '"></textarea>';
}

function fsec(title, count, body) {
  return '<div class="fsec"><div class="fsec-head"><h3>' + esc(title) + '</h3>' +
    (count !== undefined ? '<span class="count">' + count + '</span>' : '') +
    '<span class="spacer"></span></div>' + body + '</div>';
}

function chipsEditor(arr, label) {
  const list = (arr || []).map((v, i) =>
    '<span class="chip">' + esc(v) +
    '<button type="button" data-chip-del="' + label + ':' + i + '" aria-label="删除">×</button></span>').join('');
  return '<div class="chips">' + list + '</div>' +
    '<div class="chip-add"><input class="input input-sm" data-chip-add="' + label + '" placeholder="回车添加">' +
    '<button type="button" class="btn btn-ghost btn-sm" data-chip-btn="' + label + '">加</button></div>';
}

function bindValue(path, value) {
  const parts = path.split('.');
  let o = state;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}

function getValue(path) {
  const parts = path.split('.');
  let o = state;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] || {};
  return o[parts[parts.length - 1]];
}

function renderForm() {
  const m = state.meta;
  const s = state.sections;
  const parts = [];

  /* ---- 基本信息 ---- */
  parts.push(fsec('基本信息', undefined,
    '<div class="f-row">' +
      field('姓名', txt('meta.name', '你的名字')) +
      field('一句话定位', txt('meta.headline', '如：口腔正畸医生')) +
    '</div>' +
    field('头像（本地读取，不上传）',
      '<input type="file" id="photo-input" accept="image/*" class="input input-sm">' +
      '<div class="f-sub" id="photo-status">' + (m.photo ? '已加载' : '未选择') + '</div>' +
      (m.photo ? '<button type="button" class="btn btn-ghost btn-xs" id="photo-clear">移除头像</button>' : '')) +
    field('关键事实条（年龄 / 经验 / 学历 / 状态）', chipsEditor(m.facts, 'facts')) +
    '<div class="f-row">' +
      field('求职意向', txt('meta.target.role', '目标岗位')) +
      field('所属行业', txt('meta.target.industry', '如：互联网')) +
    '</div>' +
    field('期望薪资（可留空）', txt('meta.target.salary', '如：10-15K')) +
    '<div class="f-row">' +
      field('手机', txt('meta.contact.phone', '138****0000')) +
      field('邮箱', txt('meta.contact.email', 'you@example.com')) +
    '</div>' +
    '<div class="f-row">' +
      field('城市', txt('meta.contact.city', '上海')) +
      field('微信', txt('meta.contact.wechat', '选填')) +
    '</div>' +
    '<div class="f-row">' +
      field('作品集', txt('meta.contact.portfolio', '选填')) +
      field('GitHub', txt('meta.contact.github', '选填')) +
    '</div>'
  ));

  /* ---- 个人简介 ---- */
  parts.push(fsec('个人简介', s.summary.length,
    s.summary.map((it, i) =>
      '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="icon-btn" data-del="summary:' + i + '" title="删除">×</button></div>' +
      area('sections.summary.' + i + '.text', '身份定位 + 领域 + 年限 + 最强证据。例：3 年 B 端前端经验，主导过 2 个从零到一的后台系统，最大单应用日活 4 万。') +
      '</div>').join('') +
    '<button type="button" class="add-btn" data-add="summary">+ 添加简介</button>'
  ));

  /* ---- 专业技能 ---- */
  parts.push(fsec('专业技能', s.skills.length,
    s.skills.map((it, i) =>
      '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="icon-btn" data-del="skills:' + i + '" title="删除">×</button></div>' +
      field('分类名', txt('sections.skills.' + i + '.category', '如：前端')) +
      field('技能项', chipsEditor(it.items, 'skills:' + i)) +
      '</div>').join('') +
    '<button type="button" class="add-btn" data-add="skills">+ 添加技能分类</button>'
  ));

  /* ---- 工作经历 ---- */
  parts.push(fsec('工作经历', s.experience.length,
    s.experience.map((it, i) => expCard(it, i, 'experience')).join('') +
    '<button type="button" class="add-btn" data-add="experience">+ 添加工作经历</button>'
  ));

  /* ---- 项目经历 ---- */
  parts.push(fsec('项目经历', s.projects.length,
    s.projects.map((it, i) => projCard(it, i)).join('') +
    '<button type="button" class="add-btn" data-add="projects">+ 添加项目</button>'
  ));

  /* ---- 教育背景 ---- */
  parts.push(fsec('教育背景', s.education.length,
    s.education.map((it, i) =>
      '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="icon-btn" data-del="education:' + i + '" title="删除">×</button></div>' +
      '<div class="f-row">' +
        field('学校', txt('sections.education.' + i + '.school', '学校全称')) +
        field('学历', txt('sections.education.' + i + '.degree', '本科 / 硕士')) +
      '</div>' +
      '<div class="f-row">' +
        field('专业', txt('sections.education.' + i + '.major', '专业')) +
        field('GPA（选填）', txt('sections.education.' + i + '.gpa', '3.6/4.0')) +
      '</div>' +
      '<div class="f-row">' +
        field('开始', txt('sections.education.' + i + '.start', '2022.09')) +
        field('结束', txt('sections.education.' + i + '.end', '至今或 2026.06')) +
      '</div>' +
      '</div>').join('') +
    '<button type="button" class="add-btn" data-add="education">+ 添加教育经历</button>'
  ));

  /* ---- 证书与荣誉 ---- */
  parts.push(fsec('证书与荣誉', s.certificates.length,
    s.certificates.map((it, i) =>
      '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="icon-btn" data-del="certificates:' + i + '" title="删除">×</button></div>' +
      field('名称', txt('sections.certificates.' + i + '.name', '如：执业医师资格证')) +
      '<div class="f-row">' +
        field('颁发方', txt('sections.certificates.' + i + '.issuer', '选填')) +
        field('日期', txt('sections.certificates.' + i + '.date', '2024.06')) +
      '</div></div>').join('') +
    '<button type="button" class="add-btn" data-add="certificates">+ 添加证书</button>'
  ));

  /* ---- 志愿经历 ---- */
  parts.push(fsec('志愿经历', s.volunteer.length,
    s.volunteer.map((it, i) =>
      '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="icon-btn" data-del="volunteer:' + i + '" title="删除">×</button></div>' +
      field('名称', txt('sections.volunteer.' + i + '.name', '活动 / 组织名')) +
      '<div class="f-row">' +
        field('开始', txt('sections.volunteer.' + i + '.start', '2021.06')) +
        field('结束', txt('sections.volunteer.' + i + '.end', '2021.06')) +
      '</div>' +
      field('时长', txt('sections.volunteer.' + i + '.duration', '如：3 天')) +
      '<div class="f-label">内容</div>' +
      (it.bullets || []).map((b, j) =>
        '<div style="display:flex;gap:4px;margin-bottom:4px">' +
        '<input class="input input-sm" data-bind="sections.volunteer.' + i + '.bullets.' + j + '.text" placeholder="做了什么">' +
        '<button type="button" class="icon-btn" data-del="volunteer:' + i + ':bullets:' + j + '">×</button></div>').join('') +
      '<button type="button" class="add-btn" data-add-bullet="volunteer:' + i + '">+ 添加内容</button>' +
      '</div>').join('') +
    '<button type="button" class="add-btn" data-add="volunteer">+ 添加志愿经历</button>'
  ));

  /* ---- 校园经历 ---- */
  parts.push(fsec('校园经历', s.campus.length,
    s.campus.map((it, i) =>
      '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="icon-btn" data-del="campus:' + i + '" title="删除">×</button></div>' +
      field('所属院校（选填）', txt('sections.campus.' + i + '.org', '如：某大学')) +
      field('职务', chipsEditor(it.roles, 'campus:' + i)) +
      '</div>').join('') +
    '<button type="button" class="add-btn" data-add="campus">+ 添加校园经历</button>'
  ));

  document.getElementById('form-root').innerHTML = parts.join('');
  bindPhotoInput();
}

function expCard(it, i, key) {
  return '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
    '<span class="spacer"></span>' +
    '<button type="button" class="icon-btn" data-del="' + key + ':' + i + '" title="删除">×</button></div>' +
    '<div class="f-row">' +
      field('公司 / 机构', txt('sections.' + key + '.' + i + '.org', '公司全称')) +
      field('职位', txt('sections.' + key + '.' + i + '.title', '职位')) +
    '</div>' +
    '<div class="f-row">' +
      field('团队（选填）', txt('sections.' + key + '.' + i + '.team', '如：某教授团队')) +
      field('城市', txt('sections.' + key + '.' + i + '.location', '上海')) +
    '</div>' +
    '<div class="f-row">' +
      field('开始', txt('sections.' + key + '.' + i + '.start', '2024.03')) +
      field('结束', txt('sections.' + key + '.' + i + '.end', '至今')) +
    '</div>' +
    field('能力标签', chipsEditor(it.tags, key + ':' + i + ':tags')) +
    '<div class="f-label">条目（每条 = 动作 + 对象 + 结果）</div>' +
    (it.bullets || []).map((b, j) =>
      '<div style="display:flex;gap:4px;margin-bottom:4px">' +
      '<input class="input input-sm" data-bind="sections.' + key + '.' + i + '.bullets.' + j + '.text" placeholder="如：主导 X，指标从 A 降到 B">' +
      '<button type="button" class="icon-btn" data-del="' + key + ':' + i + ':bullets:' + j + '">×</button></div>').join('') +
    '<button type="button" class="add-btn" data-add-bullet="' + key + ':' + i + '">+ 添加条目</button>' +
    '</div>';
}

function projCard(it, i) {
  return '<div class="card"><div class="card-head"><span class="idx">' + (i + 1) + '</span>' +
    '<span class="spacer"></span>' +
    '<button type="button" class="icon-btn" data-del="projects:' + i + '" title="删除">×</button></div>' +
    '<div class="f-row">' +
      field('项目名', txt('sections.projects.' + i + '.title', '项目名')) +
      field('所属（选填）', txt('sections.projects.' + i + '.org', '公司 / 课程')) +
    '</div>' +
    '<div class="f-row">' +
      field('角色', txt('sections.projects.' + i + '.role', '前端负责人')) +
      field('技术栈', txt('sections.projects.' + i + '.stack', 'React + TS')) +
    '</div>' +
    '<div class="f-row">' +
      field('开始', txt('sections.projects.' + i + '.start', '2025.07')) +
      field('结束', txt('sections.projects.' + i + '.end', '2025.12')) +
    '</div>' +
    field('能力标签', chipsEditor(it.tags, 'projects:' + i + ':tags')) +
    '<div class="f-label">条目</div>' +
    (it.bullets || []).map((b, j) =>
      '<div style="display:flex;gap:4px;margin-bottom:4px">' +
      '<input class="input input-sm" data-bind="sections.projects.' + i + '.bullets.' + j + '.text" placeholder="如：设计 14 个模板，覆盖率 70%">' +
      '<button type="button" class="icon-btn" data-del="projects:' + i + ':bullets:' + j + '">×</button></div>').join('') +
    '<button type="button" class="add-btn" data-add-bullet="projects:' + i + '">+ 添加条目</button>' +
    '</div>';
}

/* ============================== 10. 渲染：主题与自定义 ============================== */

function renderThemeBtns() {
  const root = document.getElementById('theme-btns');
  root.innerHTML = Object.keys(THEMES).map(k =>
    '<button type="button" class="theme-btn" data-theme="' + k + '" aria-pressed="' +
    (state.theme === k) + '">' +
    '<span class="theme-dot" style="background:' + THEMES[k].accent + '"></span>' +
    esc(THEMES[k].label) + '</button>').join('');
}

function renderModOrder() {
  const root = document.getElementById('mod-order');
  const t = resolveTheme();
  const order = t.moduleOrder && t.moduleOrder.length ? t.moduleOrder : THEMES[state.theme].moduleOrder;
  root.innerHTML = MODULE_KEYS.map((k, i) => {
    const on = order.indexOf(k) >= 0;
    const pos = on ? order.indexOf(k) + 1 : '';
    return '<button type="button" class="mod-toggle" data-mod="' + k + '" aria-pressed="' + on + '">' +
      '<span class="ord">' + (on ? pos : '–') + '</span>' + esc(SECTION_LABELS[k]) + '</button>';
  }).join('');
}

function syncTunePanel() {
  const ov = state.overrides;
  const t = THEMES[state.theme];
  document.getElementById('tune-accent').value = ov.accent || t.accent;
  document.getElementById('tune-accent-text').value = ov.accent || '';
  document.getElementById('tune-fs').value = Math.round((ov.fontScale || 1) * 100);
  document.getElementById('tune-fs-val').textContent = Math.round((ov.fontScale || 1) * 100) + '%';
  document.getElementById('tune-density').value = ov.density || '';
  document.getElementById('tune-secstyle').value = ov.sectionStyle || '';
  document.getElementById('tune-photo').checked = !!ov.showPhoto;
  document.getElementById('tune-pw').value = ov.photoW || 22;
  document.getElementById('tune-ph').value = ov.photoH || 30;
}

/* ============================== 11. 主刷新 ============================== */

function refresh(opts) {
  opts = opts || {};
  if (!opts.keepForm) renderForm();
  if (!opts.keepThemes) renderThemeBtns();
  renderModOrder();
  syncTunePanel();

  const frame = document.getElementById('preview');
  frame.srcdoc = buildResumeHTML();

  renderLint();
  saveState();
}

/* ============================== 12. 头像 ============================== */

function bindPhotoInput() {
  const input = document.getElementById('photo-input');
  const status = document.getElementById('photo-status');
  const clear = document.getElementById('photo-clear');
  if (!input) return;

  input.addEventListener('change', function () {
    const f = input.files && input.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { status.textContent = '请选择图片文件'; return; }
    if (f.size > 8 * 1024 * 1024) { status.textContent = '图片过大（上限 8MB）'; return; }
    const rd = new FileReader();
    rd.onload = function () {
      state.meta.photo = String(rd.result);
      refresh();
    };
    rd.readAsDataURL(f);
  });

  if (clear) {
    clear.addEventListener('click', function () {
      state.meta.photo = '';
      refresh();
    });
  }
}

/* ============================== 13. 事件绑定 ============================== */

function bindEvents() {
  const formRoot = document.getElementById('form-root');

  // 文本输入（事件委托）
  formRoot.addEventListener('input', function (e) {
    const el = e.target;
    const path = el.getAttribute && el.getAttribute('data-bind');
    if (!path) return;
    bindValue(path, el.value);
    refresh({ keepForm: true });
  });

  // 点击（删除 / 添加 / chip）
  formRoot.addEventListener('click', function (e) {
    const el = e.target.closest('button');
    if (!el) return;

    // chip 删除
    const cd = el.getAttribute('data-chip-del');
    if (cd) {
      const sep = cd.indexOf(':');
      const label = cd.slice(0, sep);
      const idx = parseInt(cd.slice(sep + 1), 10);
      if (label === 'facts') state.meta.facts.splice(idx, 1);
      else if (label === 'skills' || label === 'campus') {
        const sep2 = cd.indexOf(':', sep + 1);
        const i = parseInt(cd.slice(sep + 1, sep2), 10);
        state.sections[label][i].items ? state.sections[label][i].items.splice(idx, 1)
                                       : state.sections[label][i].roles.splice(idx, 1);
      } else {
        const sep2 = cd.indexOf(':', sep + 1);
        const i = parseInt(cd.slice(sep + 1, sep2), 10);
        const sub = cd.slice(sep2 + 1);
        const arr = state.sections[label][i][sub];
        arr.splice(idx, 1);
      }
      refresh();
      return;
    }

    // chip 添加（按钮）
    const cb = el.getAttribute('data-chip-btn');
    if (cb) {
      const input = formRoot.querySelector('[data-chip-add="' + cb + '"]');
      if (input && input.value.trim()) { addChip(cb, input.value.trim()); input.value = ''; }
      return;
    }

    // 删除整卡 / bullet
    const del = el.getAttribute('data-del');
    if (del) {
      const seg = del.split(':');
      if (seg.length === 2) {
        state.sections[seg[0]].splice(parseInt(seg[1], 10), 1);
      } else if (seg.length === 4) {
        state.sections[seg[0]][parseInt(seg[1], 10)][seg[2] + 's'].splice(parseInt(seg[3], 10), 1);
      }
      refresh();
      return;
    }

    // 添加整卡
    const add = el.getAttribute('data-add');
    if (add) {
      const blank = {
        summary: { text: '' },
        skills: { category: '', items: [] },
        experience: { org: '', title: '', team: '', location: '', start: '', end: '', tags: [], bullets: [{ text: '' }] },
        projects: { title: '', org: '', role: '', stack: '', start: '', end: '', location: '', tags: [], bullets: [{ text: '' }] },
        education: { school: '', degree: '', major: '', gpa: '', start: '', end: '', location: '', bullets: [] },
        certificates: { name: '', issuer: '', date: '' },
        volunteer: { name: '', start: '', end: '', duration: '', bullets: [{ text: '' }] },
        campus: { org: '', roles: [] }
      }[add];
      state.sections[add].push(blank);
      refresh();
      // 滚到新增卡片
      setTimeout(() => {
        const cards = formRoot.querySelectorAll('.card');
        const last = cards[cards.length - 1];
        if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      return;
    }

    // 添加 bullet
    const ab = el.getAttribute('data-add-bullet');
    if (ab) {
      const seg = ab.split(':');
      state.sections[seg[0]][parseInt(seg[1], 10)].bullets.push({ text: '' });
      refresh();
      return;
    }
  });

  // chip 输入框回车
  formRoot.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const el = e.target;
    const label = el.getAttribute && el.getAttribute('data-chip-add');
    if (label && el.value.trim()) { e.preventDefault(); addChip(label, el.value.trim()); el.value = ''; }
  });

  function addChip(label, value) {
    if (label === 'facts') { state.meta.facts.push(value); }
    else if (label === 'skills' || label === 'campus') {
      const i = parseInt(label.split(':')[1], 10);
      const key = label.split(':')[0];
      const arr = state.sections[key][i][key === 'skills' ? 'items' : 'roles'];
      arr.push(value);
    } else {
      const seg = label.split(':');
      const key = seg[0], i = parseInt(seg[1], 10), sub = seg[2];
      state.sections[key][i][sub].push(value);
    }
    refresh();
  }

  // 主题切换
  document.getElementById('theme-btns').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    const k = btn.getAttribute('data-theme');
    if (k === state.theme) return;
    state.overrides._switched = true;
    state.theme = k;
    refresh();
  });

  // 自定义面板
  const tune = document.getElementById('tune-panel');
  document.getElementById('btn-tune').addEventListener('click', function () {
    const open = tune.hidden;
    tune.hidden = !open;
    this.setAttribute('aria-expanded', String(open));
  });

  document.getElementById('tune-accent').addEventListener('input', function () {
    state.overrides.accent = this.value;
    document.getElementById('tune-accent-text').value = this.value;
    refresh({ keepForm: true, keepThemes: true });
  });
  document.getElementById('tune-accent-text').addEventListener('change', function () {
    const v = this.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      state.overrides.accent = v;
      document.getElementById('tune-accent').value = v;
      refresh({ keepForm: true, keepThemes: true });
    } else { this.value = state.overrides.accent || ''; }
  });
  document.getElementById('tune-accent-reset').addEventListener('click', function () {
    state.overrides.accent = '';
    refresh();
  });
  document.getElementById('tune-fs').addEventListener('input', function () {
    state.overrides.fontScale = parseInt(this.value, 10) / 100;
    document.getElementById('tune-fs-val').textContent = this.value + '%';
    refresh({ keepForm: true, keepThemes: true });
  });
  document.getElementById('tune-density').addEventListener('change', function () {
    state.overrides.density = this.value;
    refresh({ keepForm: true, keepThemes: true });
  });
  document.getElementById('tune-secstyle').addEventListener('change', function () {
    state.overrides.sectionStyle = this.value;
    refresh({ keepForm: true, keepThemes: true });
  });
  document.getElementById('tune-photo').addEventListener('change', function () {
    state.overrides.showPhoto = this.checked;
    refresh({ keepForm: true, keepThemes: true });
  });
  ['tune-pw', 'tune-ph'].forEach(id => {
    document.getElementById(id).addEventListener('change', function () {
      const v = parseInt(this.value, 10);
      if (v >= 12 && v <= 45) {
        state.overrides[id === 'tune-pw' ? 'photoW' : 'photoH'] = v;
        refresh({ keepForm: true, keepThemes: true });
      }
    });
  });

  // 模块开关
  document.getElementById('mod-order').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-mod]');
    if (!btn) return;
    const k = btn.getAttribute('data-mod');
    const t = THEMES[state.theme];
    let order = (state.overrides.moduleOrder && state.overrides.moduleOrder.length)
      ? state.overrides.moduleOrder.slice() : t.moduleOrder.slice();
    const i = order.indexOf(k);
    if (i >= 0) order.splice(i, 1);
    else order.push(k);
    state.overrides.moduleOrder = order;
    refresh({ keepForm: true });
  });

  // 顶栏动作
  document.getElementById('btn-sample').addEventListener('click', function () {
    if (!confirm('载入示例会覆盖当前内容，确定？')) return;
    state = JSON.parse(JSON.stringify(SAMPLE));
    refresh();
  });
  document.getElementById('btn-clear').addEventListener('click', function () {
    if (!confirm('清空所有内容？此操作不可撤销。')) return;
    state = blankState();
    refresh();
  });
  document.getElementById('btn-export').addEventListener('click', function () {
    const frame = document.getElementById('preview');
    if (frame.contentWindow) frame.contentWindow.print();
  });

  // 体检面板开关（窄屏抽屉）
  const lintPane = document.getElementById('lint-pane');
  document.getElementById('btn-lint-toggle').addEventListener('click', function () {
    if (window.matchMedia('(max-width:1180px)').matches) {
      lintPane.classList.toggle('is-open');
    } else {
      lintPane.hidden = !lintPane.hidden;
    }
    this.setAttribute('aria-expanded', String(!lintPane.hidden));
  });
}

/* ============================== 14. 启动 ============================== */

function init() {
  loadState();

  // ?sample=1 直接载入示例数据：便于分享演示链接，也便于自动化测试
  const qs = new URLSearchParams(location.search);
  if (qs.get('sample') === '1') {
    state = JSON.parse(JSON.stringify(SAMPLE));
  }

  bindEvents();
  refresh();
  // 入场编排：3 组，间隔 60-120ms
  const seq = ['.pane-form', '.pane-stage', '.pane-lint'];
  seq.forEach((sel, i) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => {
      el.style.transition = 'opacity 320ms cubic-bezier(.16,1,.3,1), transform 320ms cubic-bezier(.16,1,.3,1)';
      el.style.opacity = '1';
      el.style.transform = 'none';
    }, 60 + i * 90);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
