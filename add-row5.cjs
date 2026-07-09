const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const newJSX = `
      {/* Row 5: Grade & Gender Distribution */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Grade & Gender Distribution <span className="text-slate-400 font-normal capitalize">(All Reports)</span></h3>
          <div className="h-64 w-full relative">
            <div className="absolute top-0 right-0 flex gap-3 text-[10px] font-medium">
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500"></div> Male</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-pink-500"></div> Female</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeGenderData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="Male" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Female" fill="#ec4899" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 6: Tables */}
`;

content = content.replace("{/* Row 5: Tables */}", newJSX);

fs.writeFileSync(file, content);
