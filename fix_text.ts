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

        // Replace text-slate-X with text-institutional-X
        content = content.replace(/text-institutional-50\b/g, 'text-institutional-50');
        content = content.replace(/text-institutional-100\b/g, 'text-institutional-100');
        content = content.replace(/text-institutional-200\b/g, 'text-institutional-200');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-700\b/g, 'text-institutional-700');
        content = content.replace(/text-institutional-800\b/g, 'text-institutional-800');
        content = content.replace(/text-institutional-900\b/g, 'text-institutional-900');

        // Now fix contrast issues in light mode
        // If we see text-institutional-600|400|500 that are NOT preceded by dark:
        content = content.replace(/(?<!dark:)text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/(?<!dark:)text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/(?<!dark:)text-institutional-600\b/g, 'text-institutional-600');

        // Also replace text-gray-X
        content = content.replace(/text-institutional-50\b/g, 'text-institutional-50');
        content = content.replace(/text-institutional-100\b/g, 'text-institutional-100');
        content = content.replace(/text-institutional-200\b/g, 'text-institutional-200');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/text-institutional-700\b/g, 'text-institutional-700');
        content = content.replace(/text-institutional-800\b/g, 'text-institutional-800');
        content = content.replace(/text-institutional-900\b/g, 'text-institutional-900');

        content = content.replace(/(?<!dark:)text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/(?<!dark:)text-institutional-600\b/g, 'text-institutional-600');
        content = content.replace(/(?<!dark:)text-institutional-600\b/g, 'text-institutional-600');

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed', filePath);
        }
    }
});
