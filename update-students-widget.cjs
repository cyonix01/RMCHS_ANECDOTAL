const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for studentGradeFilter
const stateRegex = /const \[timeFilter, setTimeFilter\] = useState\<'Daily' \| 'Weekly' \| 'Monthly' \| 'Yearly'\>\('Monthly'\);/;
content = content.replace(stateRegex, 
  `const [timeFilter, setTimeFilter] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>('All');`
);

// 2. Modify totalStudents calculation
const metricsRegex = /const totalStudents = students\.length;/;
content = content.replace(metricsRegex, 
  `const filteredStudents = studentGradeFilter === 'All' ? students : students.filter(s => s.gradeLevel === studentGradeFilter);
  const totalStudents = filteredStudents.length;
  const maleStudents = filteredStudents.filter(s => s.gender === 'Male').length;
  const femaleStudents = filteredStudents.filter(s => s.gender === 'Female').length;`
);

// 3. Update the UI block for "Total Students"
const uiRegex = /<div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center gap-3">[\s\S]*?<div className="text-green-600"><Users size=\{28\} \/><\/div>[\s\S]*?<div>[\s\S]*?<p className="text-\[9px\] font-bold text-green-700 uppercase">Total Students<\/p>[\s\S]*?<h3 className="text-xl font-bold text-slate-800">\{totalStudents\}<\/h3>[\s\S]*?<div className="flex items-center gap-1 text-\[9px\] font-medium text-green-600"><TrendingUp size=\{10\} \/> Real-time<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newUI = `
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="text-green-600"><Users size={20} /></div>
              <p className="text-[9px] font-bold text-green-700 uppercase">Total Students</p>
            </div>
            <select
              value={studentGradeFilter}
              onChange={(e) => setStudentGradeFilter(e.target.value)}
              className="text-[9px] border border-slate-200 rounded p-0.5 outline-none text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
          
          <div className="flex items-end gap-3">
            <h3 className="text-2xl font-bold text-slate-800 leading-none">{totalStudents}</h3>
            <div className="flex flex-col gap-0.5 mb-0.5">
              <span className="text-[9px] font-medium text-blue-600 leading-none">M: {maleStudents}</span>
              <span className="text-[9px] font-medium text-pink-600 leading-none">F: {femaleStudents}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-medium text-green-600 mt-1"><TrendingUp size={10} /> Real-time</div>
        </div>
`;

if (content.match(uiRegex)) {
  content = content.replace(uiRegex, newUI.trim());
} else {
  console.log("Regex did not match UI block");
}

fs.writeFileSync(file, content);
