const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) results.push(full);
  });
  return results;
}

const files = walk('src');
console.log('Total files scanned in src:', files.length);

let totalButtons = 0;
let buttonsWithoutAction = [];
let buttonsDisabledAlways = [];
let toastOnlyButtons = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Find all <button ...>...</button>
  const regex = /<button([\s\S]*?)>([\s\S]*?)<\/button>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    totalButtons++;
    const attrs = match[1];
    const body = match[2].trim().replace(/\s+/g, ' ');
    const hasOnClick = /onClick/i.test(attrs);
    const isSubmit = /type\s*=\s*['"]submit['"]/i.test(attrs);
    const isAlwaysDisabled = /\sdisabled(?!\s*=\s*\{)(?=[\s>])/i.test(attrs) || /disabled\s*=\s*\{\s*true\s*\}/i.test(attrs);

    if (!hasOnClick && !isSubmit) {
      buttonsWithoutAction.push({
        file: path.relative(process.cwd(), f),
        button: body.substring(0, 60),
        attrs: attrs.replace(/\s+/g, ' ').substring(0, 100)
      });
    }

    if (isAlwaysDisabled) {
      buttonsDisabledAlways.push({
        file: path.relative(process.cwd(), f),
        button: body.substring(0, 60),
        attrs: attrs.replace(/\s+/g, ' ').substring(0, 100)
      });
    }

    // Check if onClick only shows toast
    const clickMatch = attrs.match(/onClick\s*=\s*\{([^}]+)\}/);
    if (clickMatch) {
      const handler = clickMatch[1].trim();
      if ((handler.includes('addToast') || handler.includes('showToast')) && !handler.includes('api.') && !handler.includes('set') && !handler.includes('await') && !handler.includes('navigate') && !handler.includes('refresh') && !handler.includes('dispatch') && !handler.includes('setCurrentPage')) {
        toastOnlyButtons.push({
          file: path.relative(process.cwd(), f),
          button: body.substring(0, 60),
          handler: handler.substring(0, 80)
        });
      }
    }
  }
});

console.log('\n--- AUDIT SUMMARY ---');
console.log('Total buttons found:', totalButtons);
console.log('Buttons without onClick and not submit:', buttonsWithoutAction.length);
buttonsWithoutAction.forEach(b => console.log(`  [NO ACTION] ${b.file}: <button ${b.attrs}> ${b.button}`));

console.log('\nButtons always disabled:', buttonsDisabledAlways.length);
buttonsDisabledAlways.forEach(b => console.log(`  [ALWAYS DISABLED] ${b.file}: <button ${b.attrs}> ${b.button}`));

console.log('\nButtons with toast-only action (no real state/API):', toastOnlyButtons.length);
toastOnlyButtons.forEach(b => console.log(`  [TOAST ONLY] ${b.file}: ${b.button} -> ${b.handler}`));
