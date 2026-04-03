import * as fs from 'fs';
import * as path from 'path';

function walkSync(dir: string, filelist: string[] = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                walkSync(filepath, filelist);
            }
        } else {
            if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
                filelist.push(filepath);
            }
        }
    }
    return filelist;
}

const files = walkSync('.');

for (const filePath of files) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Replace bg-slate-X with bg-institutional-X
        content = content.replace(/bg-slate-([0-9]+)/g, 'bg-institutional-$1');
        
        // Replace border-slate-X with border-institutional-X
        content = content.replace(/border-slate-([0-9]+)/g, 'border-institutional-$1');

        // Replace divide-slate-X with divide-institutional-X
        content = content.replace(/divide-slate-([0-9]+)/g, 'divide-institutional-$1');

        // Replace ring-slate-X with ring-institutional-X
        content = content.replace(/ring-slate-([0-9]+)/g, 'ring-institutional-$1');

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed ${filePath}`);
        }
    } catch (e) {
        // ignore
    }
}
