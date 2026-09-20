const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '../node_modules/next/dist/server/app-render/entry-base.js'),
  path.join(__dirname, '../node_modules/next/dist/esm/server/app-render/entry-base.js'),
];

for (const file of targetFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace dynamic require of segment-explorer-node with no-op in entry-base
    if (content.includes("require('../../next-devtools/userspace/app/segment-explorer-node')")) {
      content = content.replace(
        /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)\s*\{[\s\S]*?SegmentViewStateNode\s*=\s*mod\.SegmentViewStateNode;?\s*\}/g,
        '// next-devtools segment-explorer disabled to prevent React Client Manifest bundler bug'
      );
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Successfully patched: ${file}`);
    } else {
      console.log(`Already patched or pattern not found in: ${file}`);
    }
  }
}
