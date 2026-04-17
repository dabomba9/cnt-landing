const fs = require('fs');
const path = require('path');

const homePath = path.join(__dirname, 'src/app/home/home.component.html');
const stitchPath = path.join(__dirname, '.stitch/designs/index.html');

let homeLines = fs.readFileSync(homePath, 'utf8').split('\n');
let stitchLines = fs.readFileSync(stitchPath, 'utf8').split('\n');

const headerHero = homeLines.slice(0, 110).join('\n');
const footer = homeLines.slice(475).join('\n');

const newContent = stitchLines.slice(146, 292).join('\n');

const merged = headerHero + '\n    <!-- ================= Stitch Redesign Sections ================= -->\n' + newContent + '\n' + footer;

fs.writeFileSync(homePath, merged, 'utf8');
console.log("Merge complete!");
