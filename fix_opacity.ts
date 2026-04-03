import fs from 'fs';
import path from 'path';

function walkSync(currentDirPath: string, callback: (filePath: string) => void) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath);
        } else if (stat.isDirectory() && name !== 'node_modules' && name !== 'dist' && !name.startsWith('.')) {
            walkSync(filePath, callback);
        }
    });
}

walkSync('.', function(filePath: string) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        content = content.replace(/text-text-secondary\/(50|40|30|20)/g, 'text-text-secondary');
        content = content.replace(/text-institutional-[0-9]+\/[0-9]+/g, (match) => match.split('/')[0]);
        content = content.replace(/text-primary\/[0-9]+/g, 'text-primary');

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed', filePath);
        }
    }
});
