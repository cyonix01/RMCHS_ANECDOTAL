const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Total Reports Real-time
content = content.replace(
  '<p className="text-[10px] font-bold text-green-700 uppercase mb-1">Total Reports</p>\n              <h2 className="text-2xl font-black text-slate-800 leading-none">{totalReportsCount}</h2>\n              <div className="flex items-center gap-1 text-[10px] font-medium text-green-600 mt-1">\n                <TrendingUp size={12} />\n                <span>Real-time</span>',
  '<p className="text-[10px] font-bold text-green-700 uppercase mb-1">Total Reports</p>\n              <h2 className="text-2xl font-black text-slate-800 leading-none">{totalReportsCount}</h2>\n              <div className="flex items-center gap-1 text-[10px] font-medium text-green-600 mt-1">\n                <TrendingUp size={12} />\n                <span>+{reportsThisMonth} this month, +{reportsToday} today</span>'
);

// Replace Critical Cases Real-time
content = content.replace(
  '<p className="text-[10px] font-bold text-red-600 uppercase mb-1">Critical Cases</p>\n              <h2 className="text-2xl font-black text-slate-800 leading-none">{criticalCasesCount}</h2>\n              <div className="flex items-center gap-1 text-[10px] font-medium text-red-500 mt-1">\n                <TrendingUp size={12} />\n                <span>Real-time</span>',
  '<p className="text-[10px] font-bold text-red-600 uppercase mb-1">Critical Cases</p>\n              <h2 className="text-2xl font-black text-slate-800 leading-none">{criticalCasesCount}</h2>\n              <div className="flex items-center gap-1 text-[10px] font-medium text-red-500 mt-1">\n                <TrendingUp size={12} />\n                <span>+{criticalThisMonth} this month, +{criticalToday} today</span>'
);

// Replace Resolved Cases Real-time
content = content.replace(
  '<p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Resolved Cases</p>\n              <h2 className="text-2xl font-black text-slate-800 leading-none">{resolvedCases}</h2>\n              <div className="flex items-center gap-1 text-[10px] font-medium text-blue-500 mt-1">\n                <TrendingUp size={12} />\n                <span>Real-time</span>',
  '<p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Resolved Cases</p>\n              <h2 className="text-2xl font-black text-slate-800 leading-none">{resolvedCases}</h2>\n              <div className="flex items-center gap-1 text-[10px] font-medium text-blue-500 mt-1">\n                <TrendingUp size={12} />\n                <span>+{resolvedThisMonth} this month, +{resolvedToday} today</span>'
);

fs.writeFileSync(file, content);
