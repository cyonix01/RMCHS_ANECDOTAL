const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const newDataStr = `
  // 10. Grade Level Distribution (Cases by Grade and Gender)
  const gradeGenderDataMap: Record<string, { Male: number, Female: number }> = {
    'Grade 7': { Male: 0, Female: 0 },
    'Grade 8': { Male: 0, Female: 0 },
    'Grade 9': { Male: 0, Female: 0 },
    'Grade 10': { Male: 0, Female: 0 },
    'Grade 11': { Male: 0, Female: 0 },
    'Grade 12': { Male: 0, Female: 0 },
  };

  const studentObjMap = new Map(students.map(s => [s.lrn, s]));

  allReports.forEach(r => {
    const student = studentObjMap.get(r.studentLrn);
    if (student && student.gradeLevel && student.gender) {
      if (gradeGenderDataMap[student.gradeLevel]) {
        if (student.gender === 'Male' || student.gender === 'Female') {
          gradeGenderDataMap[student.gradeLevel][student.gender]++;
        }
      }
    }
  });

  const gradeGenderData = Object.keys(gradeGenderDataMap).map(grade => ({
    name: grade.replace('Grade ', 'G'),
    Male: gradeGenderDataMap[grade].Male,
    Female: gradeGenderDataMap[grade].Female
  }));
`;

content = content.replace(
  "  if (loading) {",
  newDataStr + "\n  if (loading) {"
);

fs.writeFileSync(file, content);
