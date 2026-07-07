const fs = require('fs');
const files = ['app/(protected)/earnings/page.jsx', 'app/(protected)/analytics/page.jsx'];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"use client";\n', '');
  try {
    const parsed = JSON.parse(content);
    // Replace imports back to the new Next.js structure
    let finalCode = '"use client";\n' + parsed;
    finalCode = finalCode.replace(/['"](?:\.\.\/)+components\/([^'"]+)['"]/g, "'@/components/$1'");
    finalCode = finalCode.replace(/['"](?:\.\.\/)+context\/([^'"]+)['"]/g, "'@/context/$1'");
    finalCode = finalCode.replace(/['"](?:\.\.\/)+api(?:\\\/index)?['"]/g, "'@/services/api'");
    fs.writeFileSync(file, finalCode);
    console.log(`Fixed ${file}`);
  } catch(e) {
    console.error(`Error parsing ${file}`, e);
  }
});
