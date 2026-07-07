const fs = require('fs');

const files = ['app/(protected)/earnings/page.jsx', 'app/(protected)/analytics/page.jsx'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/^"use client";\n/, '');
  if (content.startsWith('"') && content.endsWith('"')) {
    content = JSON.parse(content);
  }
  content = '"use client";\n' + content;
  fs.writeFileSync(file, content);
});
console.log('Fixed file formats');
