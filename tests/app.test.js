/* 简历工坊 Web 应用 —— 核心逻辑自动化测试
 * 运行：node tests/app.test.js
 * 覆盖：六主题渲染、ATS 结构、自定义覆盖、体检引擎、模块开关
 */
/* 核心逻辑自动化测试：在 Node 中以 vm 加载 app.js，验证纯函数行为 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const APP = path.resolve(__dirname,'..','app','app.js');
const src = fs.readFileSync(APP, 'utf8');

// app.js 顶层是 const/let，不会成为 sandbox 属性；显式导出需要的符号
const EXPORT = [
  ';globalThis.__x = {',
  '  SAMPLE, THEMES, SECTION_LABELS, MODULE_KEYS, blankState,',
  '  buildResumeHTML, runLint, resolveTheme,',
  '  setState: function (s) { state = s; },',
  '  getState: function () { return state; }',
  '};'
].join('\n');

const sandbox = {
  console,
  document: { readyState: 'loading', addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { search: '' },
  URLSearchParams,
  setTimeout, clearTimeout,
  confirm: () => true
};
vm.createContext(sandbox);
vm.runInContext(src + EXPORT, sandbox);
const X = sandbox.__x;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' -> ' + extra : '')); }
}
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- 1. 六套主题渲染 ---------- */
console.log('\n=== 六套主题渲染 ===');
X.setState(clone(X.SAMPLE));
const accents = {};
Object.keys(X.THEMES).forEach(k => {
  const st = clone(X.SAMPLE); st.theme = k; X.setState(st);
  const html = X.buildResumeHTML();
  const m = html.match(/--accent:(#[0-9a-f]{6})/);
  accents[k] = m ? m[1] : null;
  ok(k + ' 渲染成功且含 accent', !!m && html.length > 2000, m ? m[1] : 'no accent');
});
ok('六套主题 accent 各不相同', new Set(Object.values(accents)).size === 6,
   Object.entries(accents).map(([k, v]) => k + ':' + v).join(' '));

/* ---------- 2. 渲染结构（ATS 安全） ---------- */
console.log('\n=== ATS 结构 ===');
X.setState(clone(X.SAMPLE));
const h = X.buildResumeHTML();
ok('DOCTYPE', h.startsWith('<!DOCTYPE html>'));
ok('单栏（无 table）', h.indexOf('<table') < 0);
ok('无 textarea', h.toLowerCase().indexOf('<textarea') < 0);
ok('无 img 承载文字（未传头像时）', h.indexOf('<img') < 0);
ok('A4 打印规则', h.indexOf('@page') >= 0 && h.indexOf('A4') >= 0);
ok('六模块标题齐全',
   ['个人简介', '专业技能', '工作经历', '项目经历', '教育背景', '证书与荣誉', '志愿经历', '校园经历']
     .every(t => h.indexOf(t) >= 0));
ok('求职意向渲染', h.indexOf('求职意向') >= 0);
ok('facts 渲染', h.indexOf('class="facts"') >= 0 && h.indexOf('离职-随时到岗') >= 0);
ok('tags 渲染', (h.match(/class="tag"/g) || []).length >= 3);
ok('头像位开启时渲染 img', (() => {
  const st = clone(X.SAMPLE); st.meta.photo = 'data:image/png;base64,iVBORw0KGgo=';
  X.setState(st);
  return X.buildResumeHTML().indexOf('<img class="photo"') >= 0;
})());
X.setState(clone(X.SAMPLE));

/* ---------- 3. 自定义覆盖 ---------- */
console.log('\n=== 自定义覆盖 ===');
let st = clone(X.SAMPLE); st.overrides.accent = '#123456'; X.setState(st);
ok('accent 覆盖生效', X.buildResumeHTML().indexOf('--accent:#123456') >= 0);

st = clone(X.SAMPLE); st.overrides.fontScale = 0.9; X.setState(st);
ok('font_scale 覆盖生效', X.buildResumeHTML().indexOf('--fs:9.45pt') >= 0);

st = clone(X.SAMPLE); st.overrides.density = 'compact'; X.setState(st);
ok('density 覆盖生效', X.buildResumeHTML().indexOf('--lh:1.45') >= 0);

st = clone(X.SAMPLE); st.overrides.moduleOrder = ['experience']; X.setState(st);
ok('module_order 只渲染指定模块', (() => {
  const x = X.buildResumeHTML();
  return x.indexOf('工作经历') >= 0 && x.indexOf('个人简介') < 0;
})());

st = clone(X.SAMPLE); st.overrides.sectionStyle = 'numbered'; X.setState(st);
ok('section_style=numbered 生效', X.buildResumeHTML().indexOf('counter-increment:sec') >= 0);

st = clone(X.SAMPLE); st.overrides.showPhoto = false; st.meta.photo = 'data:image/png;base64,xx'; X.setState(st);
ok('show_photo=false 时不渲染头像', X.buildResumeHTML().indexOf('<img') < 0);

/* ---------- 4. 体检引擎 ---------- */
console.log('\n=== 体检引擎 ===');
X.setState(clone(X.SAMPLE));
let r = X.runLint();
ok('干净样例 0 警告', r.findings.length === 0, JSON.stringify(r.findings.map(f => f.rule)));
ok('bullet 统计正确', r.total === 8, 'total=' + r.total);

st = clone(X.SAMPLE);
st.sections.summary = [{ text: '具备良好的沟通能力和团队协作精神，抗压能力强，学习能力强。' }];
st.sections.experience = [{
  org: '某公司', title: '工程师', start: '2024.01', end: '', tags: [],
  bullets: [
    { text: '负责日常开发工作' },
    { text: '参与团队协作与代码评审' },
    { text: '协助完成系统维护' }
  ]
}];
st.sections.projects = [];
st.sections.volunteer = [];
st.sections.campus = [];
X.setState(st);
r = X.runLint();
const rules = r.findings.map(f => f.rule);
ok('检出 AI 套话', rules.indexOf('AI 套话') >= 0, rules.join(','));
ok('检出空洞形容词', rules.indexOf('空洞形容词') >= 0);
ok('检出证据密度不足', rules.indexOf('证据密度不足') >= 0, 'ratio=' + r.noNumberRatio);
ok('检出破折号', rules.indexOf('破折号') >= 0 || (() => {
  const s2 = clone(st); s2.sections.experience[0].bullets = [{ text: '主导某项目——转化率从 3% 到 47%' }];
  X.setState(s2); return X.runLint().findings.some(f => f.rule === '破折号');
})());
ok('检出 -ing 结尾', (() => {
  const s2 = clone(st); s2.sections.experience[0].bullets = [{ text: '负责系统重构 working' }];
  X.setState(s2); return X.runLint().findings.some(f => f.rule === '进行时结尾');
})());
ok('技能枚举不误报', (() => {
  const s2 = clone(st);
  s2.sections.summary = [{ text: '3 年经验，主导过 2 个从零到一的系统。' }];
  s2.sections.experience[0].bullets = [{ text: '熟练掌握配台、四手操作、龈上洁治、牙周 GBT 刮治、树脂修复、牙体预备、全瓷冠及嵌体、贴面粘接等技能' }];
  X.setState(s2);
  const r2 = X.runLint();
  return r2.findings.filter(f => f.rule === '空洞形容词' || f.rule === '证据密度不足').length === 0;
})());

/* ---------- 5. 模块开关 ---------- */
console.log('\n=== 模块开关 ===');
st = clone(X.SAMPLE); st.overrides.moduleOrder = ['summary', 'experience']; X.setState(st);
const h2 = X.buildResumeHTML();
ok('只渲染开启的模块', h2.indexOf('个人简介') >= 0 && h2.indexOf('工作经历') >= 0 && h2.indexOf('教育背景') < 0);
st = clone(X.SAMPLE); st.sections.volunteer = []; X.setState(st);
ok('未填模块自动跳过', X.buildResumeHTML().indexOf('志愿经历') < 0);

console.log('\n===== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 =====');
process.exit(fail ? 1 : 0);
