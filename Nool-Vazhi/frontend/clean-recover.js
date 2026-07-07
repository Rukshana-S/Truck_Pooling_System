const fs = require('fs');
const lines = fs.readFileSync('C:/Users/91950/.gemini/antigravity-ide/brain/5c673af7-3f89-445b-af42-049f435e639b/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      obj.tool_calls.forEach(tc => {
        if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('DriverEarnings.js')) {
          fs.writeFileSync('app/(protected)/earnings/page.jsx', '"use client";\n' + tc.args.CodeContent);
          console.log('Recovered earnings correctly');
        }
        if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('ShipperAnalytics.js')) {
          fs.writeFileSync('app/(protected)/analytics/page.jsx', '"use client";\n' + tc.args.CodeContent);
          console.log('Recovered analytics correctly');
        }
      });
    }
  } catch(e) {}
}
