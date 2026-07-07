const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const dirs = ['app', 'components', 'context', 'services'];
dirs.forEach(dir => {
  walk(dir).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Replace ../components/ or ../../components/ with @/components/
    const newContent = content
      .replace(/['"](?:\.\.\/)+components\/([^'"]+)['"]/g, "'@/components/$1'")
      .replace(/['"](?:\.\/)+components\/([^'"]+)['"]/g, "'@/components/$1'")
      .replace(/['"](?:\.\.\/)+context\/([^'"]+)['"]/g, "'@/context/$1'")
      .replace(/['"](?:\.\.\/)+api(?:\\\/index)?['"]/g, "'@/services/api'")
      .replace(/['"](?:\.\/)+api(?:\\\/index)?['"]/g, "'@/services/api'");
      
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
    }
  });
});
console.log('Imports fixed');
