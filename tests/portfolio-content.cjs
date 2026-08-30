const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(html.includes('<html lang="th">'));
assert.ok(html.includes("let currentLang='th';"));
assert.ok(!html.includes("localStorage"), 'Opening the page always starts in Thai, regardless of a previously selected language');
for (const [, , thai, text] of html.matchAll(/<([a-z][\w-]*)\b[^>]*\bdata-th="([^"]*)"[^>]*>([^<]*)<\/\1>/g)) {
  assert.equal(text, thai, 'Initial HTML should show Thai before JavaScript runs');
}
assert.ok(html.includes('aria-controls="nav-links" aria-expanded="false"'));
assert.ok(html.includes('@media(max-width:480px){.hero-history li{grid-template-columns:minmax(0,1fr);'));
assert.ok(html.includes('.menu-toggle{min-width:44px;min-height:44px;'));
assert.ok(html.includes('.modal-head{position:static;flex:none;'));
assert.ok(html.includes('.modal-body{flex:1;min-height:0;min-width:0;overflow-y:auto;'));
assert.ok(html.includes('backdrop-filter:none;-webkit-backdrop-filter:none;'));
assert.ok(html.includes('font-size:clamp(32px,8.5vw,48px);line-height:1.2;overflow-wrap:anywhere'));
assert.ok(html.includes('.clinic-gallery{grid-template-columns:minmax(0,1fr)}'));
const menuState = { open: false, expanded: 'false' };
const menuContext = vm.createContext({
  navLinks: { classList: { toggle(name, value) { assert.equal(name, 'open'); menuState.open = value; } } },
  menuToggle: { setAttribute(name, value) { assert.equal(name, 'aria-expanded'); menuState.expanded = value; } }
});
vm.runInContext(html.match(/function setMenu\(open\)\{[^}]+\}/)[0], menuContext);
for (const open of [true, false]) {
  vm.runInContext(`setMenu(${open})`, menuContext);
  assert.equal(menuState.open, open);
  assert.equal(menuState.expanded, String(open));
}
for (const match of html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1]);
}
const projectSource = html.match(/const projects=([\s\S]*?);\s*const modal/)[1];
const projects = vm.runInNewContext(`(${projectSource})`);
const projectKeys = [...html.matchAll(/data-project="([^"]+)"/g)].map(match => match[1]);
assert.ok(!html.includes('href="resume.html"'));
assert.equal((html.match(/data-open-resume aria-haspopup="dialog"/g) || []).length, 2);
assert.ok(html.includes('<dialog class="resume-modal" id="resume-modal"'));
assert.ok(html.includes('src="card/resume-tawandaeng.jpg"'));
assert.ok(fs.existsSync(path.join(root, 'card/resume-tawandaeng.jpg')));
assert.ok(html.includes('data-en="Résumé (Thai)"'));
assert.ok(!html.includes('data-th="ผลงานเด่น"'));
assert.ok(html.includes('data-th="ผลงานหลัก"'));
assert.ok(html.includes('Completed video with BTS placement mockups'));
assert.ok(html.includes('AI video, image and audio production'));
assert.ok(!html.includes('realism-led'));
assert.ok(!html.includes('real AI-driven'));
assert.equal(projectKeys.length, 7);
assert.equal(projectKeys.filter(key => key === 'motion').length, 1);
assert.equal(projects.motion.clips.length, 2);
assert.ok(projects.motion.clips[0].src.endsWith('/งาน2.mp4'));
assert.ok(projects.motion.clips[1].src.endsWith('/งาน1.mp4'));
assert.ok(fs.existsSync(path.join(root, 'card/ai-motion-cover.png')));
const motionCard = html.match(/<article[^>]*data-project="motion"[\s\S]*?<\/article>/)[0];
assert.ok(motionCard.includes('src="card/ai-motion-cover.png"'));
assert.ok(!motionCard.includes('<video'));
assert.ok(html.includes('aspect-ratio:var(--video-ratio);'));
assert.ok(html.includes('width:min(100%,calc(var(--video-max-height,65svh) * var(--video-ratio)))'));
assert.ok(projects.motion.descriptionTh.includes('90%'));
assert.ok(projects.motion.descriptionTh.includes('โมเดล 3D'));
assert.ok(projects.motion.descriptionTh.includes('เจนจาก AI ทั้งหมด'));
for (const clip of projects.motion.clips) assert.ok(fs.existsSync(path.join(root, clip.src)));
assert.equal(projects.bts.clips.length, 3);
assert.equal(projects.lotus.clips.length, 1);
assert.equal(projects.lotus.clips[0].id, '1lT4OhfLGQSeA3GGSSsYRFldfLMzDwQhv');
assert.equal(projects.songkran.clips.length, 2);
for (const detail of ['ไม่ได้กลับบ้าน', 'ครอบครัว', 'สตอรี่บอร์ด', 'ภาพตัวละครด้วย AI', 'ผลิตวิดีโอด้วย AI', 'เสียงบรรยายช่วงท้าย']) {
  assert.ok(projects.songkran.descriptionTh.includes(detail), detail);
}
for (const detail of ['families', 'storyboard', 'character images', 'voice-over', 'generate video with AI']) {
  assert.ok(projects.songkran.description.includes(detail), detail);
}
assert.ok(!projects.songkran.descriptionTh.includes('เสียงประกอบ'));
assert.ok(!projects.songkran.description.includes('sound production'));
assert.ok(!projects.songkran.tags.some(tag => /sound/i.test(tag)));
for (const detail of ['สตอรี่บอร์ด', 'เรียบเรียงเนื้อหา', 'AI ผลิตภาพ วิดีโอ และเสียงประกอบ', 'ออนไลน์ของ Lotus’s']) {
  assert.ok(projects.lotus.descriptionTh.includes(detail), detail);
}
assert.equal(projects.clinic.titleTh, 'ภาพกราฟิกที่ทำด้วย AI');
assert.equal(projects.clinic.title, 'AI Graphic Design');
for (const detail of ['90%', 'รีทัช', 'ความสมจริง', 'ลดเวลาการผลิต', 'ควบคุมคุณภาพ']) {
  assert.ok(projects.clinic.descriptionTh.includes(detail), detail);
}
assert.ok(!html.includes('ภาพประชาสัมพันธ์ด้วย AI'));
assert.ok(html.includes('.project-description p{max-width:72ch;color:#d5dcdf;font-size:clamp(16px,1.5vw,18px);line-height:1.85;'));
assert.ok(!html.includes('selectClip'));
assert.ok(!html.includes('clip-selector'));
assert.ok(!html.includes('clip-btn'));
assert.ok(!html.includes('Two campaign executions'));
assert.equal(projects.awards.clips.length, 1);
assert.equal(projects.awards.clips[0].id, '1hziWG5gxsnQzv3Bx3hW1QfVUYE4nsl89');
assert.ok(fs.readFileSync(path.join(root, 'portfolio-1.html'), 'utf8').includes(projects.awards.clips[0].id));
assert.ok(fs.existsSync(path.join(root, 'card/AI Video.png')));
assert.ok(projects.awards.descriptionTh.includes('MediaKids'));
assert.ok(projects.awards.descriptionTh.includes('โรงเรียน'));
assert.ok(html.includes('data-category="video" tabindex="0" data-project="awards"'));
for (const key of projectKeys) assert.ok(projects[key], key);
assert.equal(projects.training.gallery.length, 3);
for (const project of Object.values(projects)) {
  for (const asset of project.gallery || []) assert.ok(fs.existsSync(path.join(root, asset)), asset);
}
assert.ok(html.includes('ประสบการณ์ด้าน AI Multimedia มากกว่า 4 ปี'));
assert.ok(html.includes('.hero-history .hero-history-summary{margin-top:7px;font-size:15px;line-height:1.8;color:#d5dcdf;'));
assert.ok(html.includes('font-size:clamp(21px,2.1vw,26px);font-weight:700;line-height:1.5;'));
assert.ok(html.includes('.hero-history strong{font-size:16px}'));
assert.ok(!html.includes('ประสบการณ์ด้าน AI Content มากกว่า 4 ปี'));
assert.ok(!html.includes('ผม'), 'Homepage copy should not use first-person Thai');
assert.ok(html.includes('data-filter="training"'));
const contact = html.match(/<section class="contact-section"[\s\S]*?<\/section>/)[0];
const expertise = html.match(/<section class="content-section" id="expertise">[\s\S]*?<\/section>/)[0];
const skills = expertise.slice(expertise.indexOf('<div class="skill-list">'));
assert.equal((skills.match(/class="skill"/g) || []).length, 5);
assert.ok(!skills.includes('<small'));
assert.ok(!/[\u0E00-\u0E7F]/.test(skills));
for (const name of ['AI Video', 'AI Images', 'Video Editing', 'After Effects', 'AI Audio']) {
  assert.ok(skills.includes(`<strong>${name}</strong>`));
}
assert.ok(html.includes('font-size:clamp(18px,1.65vw,20px);line-height:1.85;'));
assert.ok(contact.includes('<strong>tawan09003823</strong>'));
assert.ok(contact.includes('data-th="ติดต่อร่วมงาน">ติดต่อร่วมงาน</h2>'));
assert.ok(!contact.includes('พื้นที่ทำงาน'));
assert.ok(!contact.includes('ทักมาคุยงาน'));
assert.ok(!contact.includes('มีโปรเจกต์'));
const toolsPanel = html.match(/<ul class="profile-tools"[\s\S]*?<\/ul>/)[0];
const toolImages = [...toolsPanel.matchAll(/<img src="([^"]+)" alt="([^"]+)"/g)];
assert.equal(toolImages.length, 10);
assert.ok(toolsPanel.includes('alt="After Effects"'));
assert.ok(!html.includes('Tools I use'));
assert.ok(!html.includes('tools-panel'));
assert.ok(!toolsPanel.includes('<span>'));
assert.ok(html.includes('.profile-tool.claude img{clip-path:inset(1.5% round 25%)}'));
for (const [, asset, name] of toolImages) {
  assert.ok(fs.existsSync(path.join(root, asset)), asset);
  assert.ok(name.length > 0);
}
assert.ok(html.indexOf(toolsPanel) > html.indexOf('class="profile-education"'));
assert.ok(html.indexOf(toolsPanel) > html.indexOf('class="profile-actions"'));
assert.ok(html.indexOf(toolsPanel) < html.indexOf('id="contact"'));
assert.ok(html.includes('มหาวิทยาลัยกรุงเทพ'));
assert.ok(html.includes('ปริญญาตรี นิเทศศาสตร์ (โฆษณา)'));
assert.ok(html.includes('เกียรตินิยมอันดับ 2'));
assert.ok(!html.includes('CP AXTRA and Lotus’s'));
assert.ok(!html.includes('CP AXTRA และ Lotus’s'));
for (const asset of ['card/cp-axtra-logo.svg', 'card/lotuss-logo.svg']) {
  assert.ok(html.includes(asset));
  const svg = fs.readFileSync(path.join(root, asset), 'utf8');
  assert.ok(svg.includes('<svg'));
  assert.ok(!/<script|<foreignObject|\bonload\s*=/i.test(svg));
  assert.ok(!/(?:href|src)\s*=\s*["']https?:/i.test(svg));
}

const videoSizesSource = html.split(/\r?\n/).find(line => line.includes('const projectVideoSizes='));
const videoSizes = vm.runInNewContext(videoSizesSource + ';projectVideoSizes');
assert.deepEqual(Array.from(videoSizes.lotus[0]), [1080, 1920]);
assert.deepEqual(Array.from(videoSizes.songkran[1]), [1080, 1920]);
assert.deepEqual(videoSizes.bts.map(size => Array.from(size)).flat().join(','), '1280,720,1280,720,1280,720');
assert.deepEqual(videoSizes.motion.map(size => Array.from(size)).flat().join(','), '1200,1200,1200,628');
const expectedDriveIds = {
  bts: ['1tHPnQl84Y4FLXerbC5E7nHie-liRBAvc', '18yD8BnCs_6lPM7sXIcvHhyZFY-3-wkgb', '14WX3TxP6v1nN7OUuOhgprknU1pq_NYB4'],
  lotus: ['1lT4OhfLGQSeA3GGSSsYRFldfLMzDwQhv'],
  songkran: ['1SSdxnwKi5gusUEHqmRy2V3Cb92mxIt2D', '1gPe-_Hi0g55hdoR4GFqYjnoMDvikAtRi'],
  awards: ['1hziWG5gxsnQzv3Bx3hW1QfVUYE4nsl89']
};
for (const [key, ids] of Object.entries(expectedDriveIds)) {
  assert.deepEqual(Array.from(projects[key].clips, clip => clip.id), ids, `${key}: original Drive sources preserved`);
}
for (const lang of ['en', 'th']) {
 for (const mobile of [false, true]) {
  const elements = new Map();
  const frameStyle = new Map();
  const bodyClasses = new Set(), modalClasses = new Set();
  const classes = set => ({ add(...names) { names.forEach(name => set.add(name)); }, remove(...names) { names.forEach(name => set.delete(name)); }, contains(name) { return set.has(name); } });
  let scrollY = 1800, historyBacks = 0, historyPushes = 0, focusRestored = false;
  let preventScroll = false;
  const context = vm.createContext({
    projects, projectVideoSizes: videoSizes, currentLang: lang,
    modalBody: { innerHTML: '', scrollTop: 600, clientHeight: 540, querySelectorAll() { return []; }, style: { setProperty(name, value) { frameStyle.set(name, value); }, removeProperty(name) { frameStyle.delete(name); } } },
    modal: { scrollTop: 400, classList: classes(modalClasses) }, lucide: { createIcons() {} },
    window: { get scrollY() { return scrollY; }, matchMedia() { return { matches: mobile }; }, scrollTo({ top, behavior }) { assert.equal(behavior, 'instant'); scrollY = top; } },
    history: { state: null, pushState(state) { this.state = state; historyPushes++; }, back() { this.state = null; historyBacks++; } },
    getComputedStyle: () => ({ paddingTop: '14px', paddingBottom: '14px' }),
    drivePreview: id => `https://drive.google.com/file/d/${id}/preview`,
    document: {
      activeElement: { focus(options) { focusRestored = options.preventScroll; } },
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { textContent: '', focus(options) { preventScroll = options.preventScroll; } });
        return elements.get(id);
      },
      body: { classList: classes(bodyClasses) }
    }
  });
  vm.runInContext("let projectPageMode=false,projectReturnScroll=0,projectReturnFocus=null", context);
  for (const name of ['localized', 'descriptionMarkup', 'videoMarkup', 'enterProjectView', 'sizeProjectVideos', 'openProject', 'closeProject']) {
    const source = html.split(/\r?\n/).find(line => line.includes(`function ${name}(`));
    assert.ok(source, name);
    vm.runInContext(source, context);
  }
  for (const key of projectKeys) {
    context.modalBody.scrollTop = 600;
    context.modal.scrollTop = 400;
    vm.runInContext(`openProject(${JSON.stringify(key)})`, context);
    assert.equal(context.modalBody.scrollTop, 0, 'Each project opens at its description, not a previous scroll position');
    assert.equal(context.modal.scrollTop, 0);
    assert.equal(preventScroll, true, 'Focusing close should not scroll the page');
    assert.equal(frameStyle.get('--video-max-height'), mobile ? undefined : '512px');
    assert.equal(bodyClasses.has('project-page'), mobile);
    assert.equal(bodyClasses.has('modal-open'), !mobile);
    if (mobile) assert.equal(scrollY, 0, 'Mobile projects start at the top of the document');
    const title = lang === 'th' && projects[key].titleTh ? projects[key].titleTh : projects[key].title;
    assert.equal(elements.get('modal-title').textContent, title);
    if (projects[key].clips) {
      const markup = context.modalBody.innerHTML;
      assert.ok(markup.indexOf('class="project-description"') < markup.indexOf('class="video-frame'), `${key}: description above video`);
      assert.equal((markup.match(/class="project-description"/g) || []).length, 1);
      const remoteClips = Array.from(projects[key].clips).filter(clip => !clip.src);
      const localClips = Array.from(projects[key].clips).filter(clip => clip.src);
      assert.equal((markup.match(/<iframe /g) || []).length, remoteClips.length);
      assert.equal((markup.match(/class="video-frame drive-video"/g) || []).length, remoteClips.length);
      assert.ok(!markup.includes('target="_blank"'), 'Videos must stay on the portfolio page');
      assert.ok(!/<a[^>]+href="https:\/\/drive\.google\.com/.test(markup), 'Keep Drive playback embedded, not external links');
      assert.equal((markup.match(/<video controls playsinline/g) || []).length, localClips.length);
      const ratios = [...markup.matchAll(/style="--video-ratio:([\d.]+)"/g)].map(match => Number(match[1]));
      assert.deepEqual(ratios, Array.from(projects[key].clips, (_, index) => {
        const [width, height] = videoSizes[key]?.[index] || [16, 9];
        return width / height;
      }), `${key}: each clip uses its own aspect ratio`);
      assert.equal((markup.match(/allowfullscreen/g) || []).length, remoteClips.length);
      assert.ok(!markup.includes('<button'), `${key}: no clip selection buttons`);
      const sources = [...markup.matchAll(/<iframe src="([^"]+)"/g)].map(match => match[1]);
      assert.deepEqual(sources, remoteClips.map(clip => `https://drive.google.com/file/d/${clip.id}/preview`), `${key}: clips stay in order`);
      const localSources = [...markup.matchAll(/<source src="([^"]+)"/g)].map(match => match[1]);
      assert.deepEqual(localSources, localClips.map(clip => clip.src), `${key}: local videos stay in order`);
      if (remoteClips.length) assert.equal((markup.match(/loading="lazy"/g) || []).length, projects[key].clips.length - 1);
    }
    if (projects[key].gallery) {
      assert.equal((context.modalBody.innerHTML.match(/<img /g) || []).length, projects[key].gallery.length);
    }
    if (key === 'training') assert.ok(!context.modalBody.innerHTML.includes('TIC Clinic'));
    if (key === 'awards') {
      assert.ok(context.modalBody.innerHTML.includes(`https://drive.google.com/file/d/${projects.awards.clips[0].id}/preview`));
      assert.ok(context.modalBody.innerHTML.includes(lang === 'th' ? 'วิดีโอพิธีมอบรางวัล' : 'Awards Ceremony Video'));
    }
    vm.runInContext('closeProject()', context);
    assert.equal(context.modalBody.innerHTML, '', 'Closing unloads the players');
    assert.equal(bodyClasses.size, 0, 'Closing restores the homepage');
    assert.equal(focusRestored, true);
    assert.equal(scrollY, 1800, 'Return to the portfolio scroll position');
  }
  assert.equal(historyPushes, mobile ? projectKeys.length : 0);
  assert.equal(historyBacks, mobile ? projectKeys.length : 0);
  vm.runInContext("openProject('bts')", context);
  const pushesBeforeDuplicate = historyPushes;
  vm.runInContext("openProject('bts')", context);
  assert.equal(historyPushes, pushesBeforeDuplicate, 'Do not stack duplicate project history entries');
  context.modalBody.clientHeight = 280;
  vm.runInContext('sizeProjectVideos()', context);
  assert.equal(frameStyle.get('--video-max-height'), mobile ? undefined : '252px', 'Mobile frames do not resize with the browser toolbar');
  const backsBeforePop = historyBacks;
  vm.runInContext('closeProject(true)', context);
  assert.equal(historyBacks, backsBeforePop, 'Browser Back must not trigger another Back');
  assert.equal(context.modalBody.innerHTML, '', 'Closing the project unloads its players');
  const pushesBeforeForward = historyPushes;
  vm.runInContext("openProject('bts',true)", context);
  assert.equal(historyPushes, pushesBeforeForward, 'Forward restores the project without adding another history entry');
  assert.equal(bodyClasses.has('project-page'), true);
  vm.runInContext('closeProject(true)', context);
 }
}
assert.ok(html.includes('body.project-page>header,body.project-page>main{display:none}'));
assert.ok(html.includes('.project-page .modal.open{position:static;display:block;height:auto;'));
assert.ok(html.includes('.project-page .modal-body{overflow:visible;'));
assert.ok(html.includes('.project-page .video-frame{width:min(100%,calc(70svh * var(--video-ratio)))}'));
assert.ok(html.includes('id="project-return"'));
assert.ok(html.includes('.video-frame.drive-video{min-width:0;max-width:100%;min-height:320px}'), 'Provide real, unscaled room for Drive controls without horizontal overflow');
assert.ok(html.includes('.video-frame iframe{transform:none}'));
assert.ok(!html.includes('iframe.style.transform'), 'Do not scale native iPhone video controls');

const noOpClasses = { add() {}, remove() {} };
const cards = [...html.matchAll(/<article[^>]+data-category="([^"]+)"/g)].map(match => ({ dataset: { category: match[1] }, hidden: false }));
const filters = ['all', 'video', 'image', 'training'].map(filter => ({
  dataset: { filter }, classList: noOpClasses,
  addEventListener(event, callback) { this.click = callback; }
}));
const filterContext = vm.createContext({ document: {
  querySelectorAll(selector) { return selector === '.filter' ? filters : cards; }
} });
const filterSource = html.split(/\r?\n/).find(line => line.includes("querySelectorAll('.filter').forEach(btn=>"));
vm.runInContext(filterSource, filterContext);
for (const filter of filters) {
  filter.click();
  for (const card of cards) assert.equal(card.hidden, filter.dataset.filter !== 'all' && card.dataset.category !== filter.dataset.filter);
}
require('./resume-interactions.cjs');
console.log('PASS: bilingual copy, seven project dialogs, résumé popup and zoom, local assets and category filters.');
