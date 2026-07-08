const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if we need to import handleError
  let needsImport = false;
  
  // Replace standard 500 error handling
  const regex = /res\.status\(500\)\.json\(\{.*err.*\}\);/g;
  const regex2 = /res\.status\(500\)\.send\(['"]Server Error['"]\);/g;
  
  if (regex.test(content) || regex2.test(content) || content.includes('res.status(500).json({ message: err.message })')) {
    content = content.replace(/res\.status\(500\)\.json\(\{.*?err.*?\}\);/g, 'handleError(res, err);');
    content = content.replace(/res\.status\(500\)\.send\(['"]Server Error['"]\);/g, 'handleError(res, err);');
    
    // Fallback for cases missing semicolon or slightly different spacing
    content = content.replace(/res\.status\(500\)\.json\(\{\s*message:\s*err\.message\s*\}\)/g, 'handleError(res, err)');
    
    needsImport = true;
  }
  
  if (needsImport && !content.includes('handleError')) {
    content = `const { handleError } = require('../utils/errorHandler');\n` + content;
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  } else if (needsImport) {
    if (!content.includes('../utils/errorHandler')) {
      content = `const { handleError } = require('../utils/errorHandler');\n` + content;
    }
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
