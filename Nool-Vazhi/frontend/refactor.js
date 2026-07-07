const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('app');
files.forEach(file => {
  if (file.includes('layout.jsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let needsClient = content.includes('useState') || 
                    content.includes('useEffect') || 
                    content.includes('useAuth') || 
                    content.includes('useRouter') || 
                    content.includes('useParams') || 
                    content.includes('useSearchParams') || 
                    content.includes('onClick') || 
                    content.includes('onChange') || 
                    content.includes('window.') || 
                    content.includes('localStorage') ||
                    content.includes('react-leaflet');
                    
  if (needsClient && !content.startsWith('"use client"')) {
    content = '"use client";\n' + content;
  }
  
  content = content.replace(/import\s+\{([^}]*?)\}\s+from\s+['"]react-router-dom['"]/g, (match, imports) => {
    let newImports = [];
    let hasLink = false;
    if (imports.includes('Link')) hasLink = true;
    
    let navImports = [];
    if (imports.includes('useNavigate')) navImports.push('useRouter');
    if (imports.includes('useParams')) navImports.push('useParams');
    if (imports.includes('useSearchParams')) navImports.push('useSearchParams');
    if (imports.includes('useLocation')) navImports.push('usePathname');
    
    let res = '';
    if (hasLink) res += "import Link from 'next/link';\n";
    if (navImports.length > 0) res += `import { ${navImports.join(', ')} } from 'next/navigation';\n`;
    return res;
  });
  
  content = content.replace(/const\s+(\w+)\s*=\s*useNavigate\(\)/g, 'const $1 = useRouter()');
  // fix link components
  content = content.replace(/<Link([^>]*)to=/g, '<Link$1href=');
  
  fs.writeFileSync(file, content);
});

console.log('Processed pages');
