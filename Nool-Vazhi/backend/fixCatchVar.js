const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // If the file has `catch (error)` and `handleError(res, err)`, change `catch (error)` to `catch (err)`
  // Or change `handleError(res, err)` to `handleError(res, error)` based on context. 
  // Safest is to just replace `catch (error)` with `catch (err)` globally, and also replace `console.error(..., error)` to `console.error(..., err)`
  if (content.includes('catch (error)')) {
    content = content.replace(/catch\s*\(\s*error\s*\)/g, 'catch (err)');
    content = content.replace(/console\.error\(([^,]+),\s*error\s*\)/g, 'console.error($1, err)');
    content = content.replace(/error\.message/g, 'err.message');
    content = content.replace(/error\.name/g, 'err.name');
    content = content.replace(/error\.code/g, 'err.code');
    fs.writeFileSync(filePath, content);
    console.log(`Fixed error var in ${file}`);
  }
  
  // also check if there are other catch variable names like `catch (e)`
  if (content.includes('catch (e)') && !content.includes('catch (err)')) {
    content = content.replace(/catch\s*\(\s*e\s*\)/g, 'catch (err)');
    content = content.replace(/e\.message/g, 'err.message');
    fs.writeFileSync(filePath, content);
    console.log(`Fixed e var in ${file}`);
  }
});
