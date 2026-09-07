const fs = require('fs');

let content = fs.readFileSync('src/components/auth/AuthModal.tsx', 'utf8');

content = content.replace(/const handleQuickLogin = async \(role: UserRole\) => \{\s*switchRole\(role\);\s*closeAuthModal\(\);\s*\};\s*/, '');
content = content.replace("Sparkles", "");

fs.writeFileSync('src/components/auth/AuthModal.tsx', content);
