const fs = require('fs');

let content = fs.readFileSync('src/components/auth/AuthModal.tsx', 'utf8');

// Find the quick-switch demo block
const demoStart = '<div className="px-6 sm:px-8 py-3 bg-[#FEFAE0] border-b border-[#E8E4D9] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">';
const demoAltStart = '<div className="px-6 sm:px-8 py-3 bg-[#FEFAE0] border-b border-[#E8E4D9] flex flex-col sm:flex-row';
// We can just use string replacement if we are careful, or a regex to remove the block that says "Quick-Switch Demo Persona (All 8 Roles)"

// Let's replace the whole demo block that is visible in AuthModal.tsx
const demoRegex = /<div className="px-6 sm:px-8 py-3 bg-\[#FEFAE0\][^>]*>[\s\S]*?Quick-Switch Demo Persona[\s\S]*?<\/div>\s*<\/div>/g;

content = content.replace(demoRegex, '');

// Also remove the `import { envConfig } from ...` if it's there for this purpose, but wait it wasn't.

fs.writeFileSync('src/components/auth/AuthModal.tsx', content);
