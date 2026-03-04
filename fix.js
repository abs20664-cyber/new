const fs = require('fs');
const file = 'src/pages/EconomicDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf("{activeTab === 'students' ? (");
const endIdx = content.indexOf("{activeTab === 'audit' && (");

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = content.substring(0, startIdx) + 
`{activeTab === 'students' ? (
                        <StudentList />
                    ) : (
                        <TeacherList />
                    )}
                </div>
            )}

            ` + content.substring(endIdx);
    fs.writeFileSync(file, newContent);
    console.log("Success");
} else {
    console.log("Could not find markers");
}
