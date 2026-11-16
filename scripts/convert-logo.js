const fs = require('fs');
const path = require('path');

// We have public/logo-asc-benin.jpg
const srcPath = path.join(__dirname, '..', 'public', 'logo-asc-benin.jpg');
const destPath = path.join(__dirname, '..', 'public', 'logo-ascq.png');
const destAsc = path.join(__dirname, '..', 'public', 'logo-asc.png');

// Copy directly to logo-asc.png and logo-ascq.png
fs.copyFileSync(srcPath, destPath);
fs.copyFileSync(srcPath, destAsc);
console.log('Logo copied successfully to logo-ascq.png and logo-asc.png');
