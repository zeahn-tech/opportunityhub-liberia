const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  "Bell\n} from 'lucide-react';",
  "Bell,\n  Activity,\n  FileText,\n  Bookmark,\n  Settings\n} from 'lucide-react';"
);

// Also we need to remove the "Quick-Switch Demo Persona" from Navbar which I see at line 325
const roleSwitcherRegex = /\{\/\* Role Authorization Switcher \(All 8 Roles\) \*\/\}[\s\S]*?\{\/\* User Profile \/ Account Menu \*\/\}/;
content = content.replace(roleSwitcherRegex, '{/* User Profile / Account Menu */}');

fs.writeFileSync('src/components/Navbar.tsx', content);
