const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
  const fetchData = () => {
    Promise.all([
      fetch("/api/reports").then(res => res.json()),
      fetch("/api/critical-reports").then(res => res.json()),
      fetch("/api/students").then(res => res.json())
    ]).then(([reportsData, criticalData, studentsData]) => {
      let filteredGeneral = reportsData || [];
      let filteredCritical = criticalData || [];
      
      if (user) {
        const teacherName = \\\`\\\${user.firstName} \\\${user.lastName}\\\`;
        if (user.role === 'Admin' || user.role === 'Guidance') {
          // Admin and Guidance see all records across entire school
        } else if (user.role === 'Adviser') {
          const adviserGrade = user.gradeLevel;
          const adviserSection = user.section;
          const studentMap = new Map<string, any>((studentsData || []).map((s: any) => [s.lrn, s]));
          
          filteredGeneral = filteredGeneral.filter((r: any) => {
            const student = studentMap.get(r.studentLrn);
            return student && student.gradeLevel === adviserGrade && student.section === adviserSection;
          });
          
          filteredCritical = filteredCritical.filter((r: any) => {
            const student = studentMap.get(r.studentLrn);
            return student && student.gradeLevel === adviserGrade && student.section === adviserSection;
          });
        } else {
          filteredGeneral = filteredGeneral.filter((r: any) => r.reportedBy === teacherName || r.createdBy === user.email);
          filteredCritical = filteredCritical.filter((r: any) => r.reportedBy === teacherName);
        }
      }

      setReports(filteredGeneral);
      setCriticalReports(filteredCritical);
      setStudents(studentsData || []);
      setLoading(false);
    }).catch(err => {
      if (err instanceof Error && err.message === "Failed to fetch") return; // Silent on network error during polling
      console.error("Analytics fetch error:", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user]);
`;

const startIndex = content.indexOf("  useEffect(() => {");
const endIndex = content.indexOf("  }, [user]);") + 13;

content = content.substring(0, startIndex) + replacement.trim() + "\n\n" + content.substring(endIndex);
fs.writeFileSync(file, content);
