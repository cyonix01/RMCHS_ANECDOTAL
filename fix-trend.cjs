const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
const stateReplacement = `
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
`;
content = content.replace('  const [loading, setLoading] = useState(true);', stateReplacement.trim());

// 2. Replace Trend Data generation
const trendDataGenRegex = /\/\/ 2\. Trend Data \(Group by month\)[\s\S]*?new Date\(\)\.getMonth\(\)\);/m;

const newTrendDataGen = `
  // 2. Trend Data (Dynamic based on timeFilter)
  let reportTrendData: { name: string, value: number }[] = [];
  let reportsVsResolvedData: { name: string, Reports: number, Resolved: number, Pending: number }[] = [];

  if (timeFilter === 'Monthly') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);
    const resolvedMonthCounts = new Array(12).fill(0);
    
    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        monthCounts[m]++;
        if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedMonthCounts[m]++;
      }
    });
    
    reportTrendData = monthNames.map((name, i) => ({ name, value: monthCounts[i] })).filter((d, i) => d.value > 0 || i <= new Date().getMonth());
    reportsVsResolvedData = monthNames.map((name, i) => ({
      name, Reports: monthCounts[i], Resolved: resolvedMonthCounts[i], Pending: monthCounts[i] - resolvedMonthCounts[i]
    })).filter((d, i) => d.Reports > 0 || i <= new Date().getMonth());
  } else if (timeFilter === 'Daily') {
    // Last 7 days
    const days = 7;
    const dayNames = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayNames.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    const dayCounts = new Array(days).fill(0);
    const resolvedDayCounts = new Array(days).fill(0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);

    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime()) && d >= cutoff && d <= today) {
        const diffTime = Math.abs(today.getTime() - d.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const idx = (days - 1) - diffDays;
        if (idx >= 0 && idx < days) {
          dayCounts[idx]++;
          if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedDayCounts[idx]++;
        }
      }
    });

    reportTrendData = dayNames.map((name, i) => ({ name, value: dayCounts[i] }));
    reportsVsResolvedData = dayNames.map((name, i) => ({
      name, Reports: dayCounts[i], Resolved: resolvedDayCounts[i], Pending: dayCounts[i] - resolvedDayCounts[i]
    }));
  } else if (timeFilter === 'Weekly') {
    // Last 4 weeks
    const weeks = 4;
    const weekNames = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const weekCounts = new Array(weeks).fill(0);
    const resolvedWeekCounts = new Array(weeks).fill(0);

    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28); // 4 weeks

    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime()) && d > cutoff && d <= today) {
        const diffTime = today.getTime() - d.getTime();
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        const idx = (weeks - 1) - diffWeeks;
        if (idx >= 0 && idx < weeks) {
          weekCounts[idx]++;
          if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedWeekCounts[idx]++;
        }
      }
    });

    reportTrendData = weekNames.map((name, i) => ({ name, value: weekCounts[i] }));
    reportsVsResolvedData = weekNames.map((name, i) => ({
      name, Reports: weekCounts[i], Resolved: resolvedWeekCounts[i], Pending: weekCounts[i] - resolvedWeekCounts[i]
    }));
  } else if (timeFilter === 'Yearly') {
    // Last 5 years
    const years = 5;
    const currentYear = new Date().getFullYear();
    const yearNames = [];
    for (let i = years - 1; i >= 0; i--) {
      yearNames.push((currentYear - i).toString());
    }
    const yearCounts = new Array(years).fill(0);
    const resolvedYearCounts = new Array(years).fill(0);

    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const diffYears = currentYear - y;
        const idx = (years - 1) - diffYears;
        if (idx >= 0 && idx < years) {
          yearCounts[idx]++;
          if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedYearCounts[idx]++;
        }
      }
    });

    reportTrendData = yearNames.map((name, i) => ({ name, value: yearCounts[i] }));
    reportsVsResolvedData = yearNames.map((name, i) => ({
      name, Reports: yearCounts[i], Resolved: resolvedYearCounts[i], Pending: yearCounts[i] - resolvedYearCounts[i]
    }));
  }
`;

content = content.replace(trendDataGenRegex, newTrendDataGen.trim());


// 3. Replace the UI for Report Trend
const uiRegex = /<h3 className="text-\[11px\] font-bold text-slate-700 uppercase mb-4">Report Trend <span className="text-slate-400 font-normal capitalize">\(This Year\)<\/span><\/h3>/;
const newUI = `
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase">Report Trend</h3>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="text-[10px] border border-slate-200 rounded p-1 outline-none text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
`;

content = content.replace(uiRegex, newUI.trim());

fs.writeFileSync(file, content);
