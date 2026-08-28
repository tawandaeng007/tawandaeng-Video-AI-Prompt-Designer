const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.slice(html.indexOf("    const resumeModal="), html.indexOf('    const drivePreview='));
assert.ok(source.includes("resumeViewer.addEventListener('pointerdown',startResumePointer)"));
assert.ok(html.includes('touch-action:none'));
assert.ok(!html.includes('user-scalable=no'), 'Do not disable browser zoom');
assert.ok(html.includes('draggable="false"'));

function element() {
  const classes = new Set(), listeners = new Map();
  return {
    style: {}, attributes: {}, focused: false,
    classList: {
      add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force = !classes.has(name)) { if (force) classes.add(name); else classes.delete(name); return force; }
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
    fire(name, args = {}) { for (const fn of listeners.get(name) || []) fn(args); }
  };
}

for (const width of [294, 364, 1000]) {
  const image = element(), viewer = element(), modal = element(), zoom = element(), close = element();
  const percent = element(), range = element(), minus = element(), plus = element();
  const body = element(), window = element(), links = [element(), element()], project = element();
  const captures = new Set();
  Object.assign(viewer, {
    clientWidth: width, clientHeight: 440, clientLeft: 0, clientTop: 0,
    getBoundingClientRect() { return { left: 10, top: 100 }; },
    querySelector(name) { assert.equal(name, 'img'); return image; },
    setPointerCapture(id) { captures.add(id); }, hasPointerCapture(id) { return captures.has(id); },
    releasePointerCapture(id) { captures.delete(id); this.fire('lostpointercapture', { pointerId: id }); }
  });
  let left = 0, top = 0;
  const imageWidth = () => image.style.width === '100%' ? viewer.clientWidth : parseFloat(image.style.width);
  Object.defineProperties(viewer, {
    scrollLeft: { get: () => left, set: n => { left = Math.max(0, Math.min(n, imageWidth() - viewer.clientWidth)); } },
    scrollTop: { get: () => top, set: n => { top = Math.max(0, Math.min(n, imageWidth() * 1754 / 1241 - viewer.clientHeight)); } }
  });
  Object.assign(modal, {
    open: false, showModal() { this.open = true; }, close() { this.open = false; this.fire('close'); }
  });
  const elements = { 'resume-modal': modal, 'resume-viewer': viewer, 'resume-zoom': zoom, 'resume-close': close, 'project-modal': project, 'resume-percent': percent, 'resume-range': range, 'resume-minus': minus, 'resume-plus': plus };
  const context = vm.createContext({ window, document: {
    body, getElementById: id => elements[id],
    querySelectorAll(selector) { assert.equal(selector, '[data-open-resume]'); return links; }
  } });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  function pointer(action, id, x, y, type = 'touch', button = 0) {
    const event = { pointerId: id, pointerType: type, button, clientX: x + 10, clientY: y + 100, prevented: false, preventDefault() { this.prevented = true; } };
    viewer.fire(action, event);
    return event;
  }
  function fit() { if (zoom.attributes['aria-pressed'] === 'true') zoom.fire('click'); }
  function scale() { return run('resumeScale'); }
  function near(a, b, label) { assert.ok(Math.abs(a - b) < 0.001, `${label}: ${a} vs ${b}`); }

  links[0].fire('click');
  assert.ok(modal.open && close.focused && body.classList.contains('modal-open'));
  assert.equal(image.style.width, '100%');
  assert.equal(zoom.attributes['aria-pressed'], 'false');
  assert.equal(percent.value, '100');
  assert.ok(minus.disabled && !plus.disabled);
  percent.value = '175'; percent.fire('change');
  assert.equal(scale(), 1.75); assert.equal(range.value, '175');
  plus.fire('click'); assert.equal(percent.value, '200');
  minus.fire('click'); assert.equal(percent.value, '175');
  range.value = '250'; range.fire('input'); assert.equal(scale(), 2.5);
  percent.value = '900'; percent.fire('change'); assert.equal(percent.value, '400'); assert.ok(plus.disabled);
  percent.value = 'invalid'; percent.fire('change'); assert.equal(percent.value, '400');
  percent.value = ''; percent.fire('change'); assert.equal(percent.value, '400');
  percent.value = '75'; percent.fire('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(percent.value, '100'); assert.ok(minus.disabled);
  zoom.fire('click');
  assert.ok(scale() >= 2 && scale() <= 4);
  assert.equal(zoom.attributes['aria-pressed'], 'true');
  const before = { left, top };
  pointer('pointerdown', 1, 150, 240, 'mouse');
  assert.ok(captures.has(1) && viewer.classList.contains('dragging'));
  pointer('pointermove', 1, 110, 180, 'mouse');
  near(left, before.left + 40, 'Mouse pans horizontally');
  near(top, before.top + 60, 'Mouse pans vertically');
  pointer('pointerup', 1, 110, 180, 'mouse');
  assert.ok(!captures.size && !viewer.classList.contains('dragging'));
  assert.equal(pointer('pointerdown', 2, 100, 100, 'mouse', 2).prevented, false);
  assert.equal(captures.size, 0, 'Right click should not start a drag');
  assert.equal(pointer('pointerdown', 2, viewer.clientWidth + 5, 100, 'mouse').prevented, false);

  fit();
  assert.equal(left, 0); assert.equal(top, 0);
  // Pinch starts directly on the fitted image, without pressing the zoom button.
  pointer('pointerdown', 10, 70, 180);
  pointer('pointerdown', 11, 170, 180);
  pointer('pointermove', 11, 220, 180);
  near(scale(), 1.5, 'Two fingers enlarge image');
  assert.equal(percent.value, '150'); assert.equal(range.value, '150');
  assert.equal(zoom.attributes['aria-pressed'], 'true');
  pointer('pointerup', 10, 70, 180);
  const pinchTop = top;
  pointer('pointermove', 11, 220, 140);
  near(top, pinchTop + 40, 'Remaining finger continues panning without a jump');
  pointer('pointercancel', 11, 220, 140);
  assert.equal(run('resumePointers.size'), 0);

  fit(); run('setResumeScale(2,{x:140,y:200})');
  const contentX = (left + 140) / scale(), contentY = (top + 200) / scale();
  pointer('pointerdown', 10, 90, 200);
  pointer('pointerdown', 11, 190, 200);
  pointer('pointerdown', 12, 240, 200);
  assert.equal(run('resumePointers.size'), 2, 'Ignore a third finger');
  pointer('pointermove', 11, 230, 200);
  pointer('pointermove', 10, 50, 200);
  near(scale(), 3.6, 'Pinch scale');
  near((left + 140) / scale(), contentX, 'Content stays beneath pinch midpoint horizontally');
  near((top + 200) / scale(), contentY, 'Content stays beneath pinch midpoint vertically');
  pointer('pointermove', 11, 1200, 200);
  assert.equal(scale(), 4, 'Maximum zoom');
  pointer('pointermove', 11, 51, 200);
  assert.equal(scale(), 1, 'Minimum zoom');
  close.fire('click');
  assert.ok(!modal.open && !body.classList.contains('modal-open'));
  assert.equal(captures.size, 0, 'Closing while dragging releases pointers');
  links[1].fire('click');
  assert.equal(image.style.width, '100%');
  assert.equal(left, 0); assert.equal(top, 0);
  zoom.fire('click');
  viewer.clientWidth += 40;
  window.fire('resize');
  assert.equal(scale(), 1, 'Orientation/viewport changes refit image');
  assert.equal(run('resumeFitWidth'), viewer.clientWidth);
  modal.fire('click', { target: modal });
  assert.ok(!modal.open, 'Backdrop closes résumé');
}
console.log('PASS: résumé mouse pan, direct touch pinch, anchor, bounds, pointer cleanup, resize and reopen at three widths.');
