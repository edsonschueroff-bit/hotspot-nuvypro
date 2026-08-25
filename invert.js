const fs = require('fs');
const path = '/var/www/nuvycore/style.css';

let css = fs.readFileSync(path, 'utf8');

// 1. Invert CSS Variables
css = css.replace('--dark-navy: #0f172a;', '--dark-navy: #f8fafc;');
css = css.replace('--navy-slate: #1e293b;', '--navy-slate: #ffffff;');
css = css.replace('--navy-card: #182234;', '--navy-card: #ffffff;');
css = css.replace('--navy-border: rgba(255, 255, 255, 0.1);', '--navy-border: #e2e8f0;');
css = css.replace('--text-white: #ffffff;', '--text-white: #0f172a;');
css = css.replace('--text-muted: #94a3b8;', '--text-muted: #475569;');
css = css.replace('--light-bg: #f8fafc;', '--light-bg: #f1f5f9;');

// 2. Adjust Navbar and transparent backgrounds
css = css.replace(/background: rgba\(15, 23, 42, 0\.88\);/g, 'background: rgba(255, 255, 255, 0.88);');
css = css.replace(/background: rgba\(15, 23, 42, 0\.98\);/g, 'background: rgba(255, 255, 255, 0.98);');
css = css.replace(/box-shadow: 0 4px 20px rgba\(0, 0, 0, 0\.3\);/g, 'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);');

// ghost button
css = css.replace(/background: rgba\(255, 255, 255, 0\.06\);/g, 'background: rgba(0, 0, 0, 0.04);');
css = css.replace(/background: rgba\(255, 255, 255, 0\.12\);/g, 'background: rgba(0, 0, 0, 0.08);');
css = css.replace(/border-color: rgba\(255, 255, 255, 0\.25\);/g, 'border-color: rgba(0, 0, 0, 0.15);');

// hero background and badges
css = css.replace(/rgba\(37, 99, 235, 0\.18\)/g, 'rgba(37, 99, 235, 0.05)');
css = css.replace(/rgba\(249, 115, 22, 0\.12\)/g, 'rgba(249, 115, 22, 0.05)');
css = css.replace(/linear-gradient\(rgba\(255, 255, 255, 0\.04\)/g, 'linear-gradient(rgba(0, 0, 0, 0.04)');

css = css.replace(/background: rgba\(30, 41, 59, 0\.7\);/g, 'background: rgba(255, 255, 255, 0.9);');
css = css.replace(/background-color: rgba\(30, 41, 59, 0\.5\);/g, 'background-color: rgba(255, 255, 255, 0.7);');

// features list border
css = css.replace(/border-bottom: 1px solid rgba\(255, 255, 255, 0\.05\);/g, 'border-bottom: 1px solid rgba(0, 0, 0, 0.05);');

fs.writeFileSync(path, css, 'utf8');
console.log('CSS invertido com sucesso!');
