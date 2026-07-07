const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Replace alert(...)
      if (content.includes('alert(')) {
        content = content.replace(/alert\((['"`].*?['"`]|\S+?)\)/g, (match, p1) => {
          if (p1.toLowerCase().includes('success')) {
            return `toast.success(${p1})`;
          } else {
            return `toast.error(${p1})`;
          }
        });
        modified = true;
      }

      // Check for toast usage but missing import
      if (content.includes('toast.') && !content.includes("import { toast }")) {
        const importStatement = "import { toast } from 'react-hot-toast';\n";
        // insert after first import or at top
        const firstImportIdx = content.indexOf('import ');
        if (firstImportIdx !== -1) {
          const endOfImport = content.indexOf('\n', firstImportIdx);
          content = content.slice(0, endOfImport + 1) + importStatement + content.slice(endOfImport + 1);
        } else {
          content = importStatement + content;
        }
        modified = true;
      }

      // Check for ConfirmModal import and usage, replace with ConfirmationModal
      if (content.includes('ConfirmModal') && !content.includes('import ConfirmationModal')) {
        content = content.replace(/ConfirmModal/g, 'ConfirmationModal');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/app'));
