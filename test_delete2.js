async function test() {
  const reports = await fetch('http://localhost:3000/api/reports').then(res=>res.json());
  if (reports.length > 0) {
    const id = reports[0].id;
    console.log("Attempting to delete report", id);
    const res = await fetch('http://localhost:3000/api/reports/' + id, { method: 'DELETE' });
    console.log(res.status, await res.text());
    
    const reportsAfter = await fetch('http://localhost:3000/api/reports').then(res=>res.json());
    console.log("Exists after delete?", reportsAfter.some(r => r.id === id));
  } else {
    console.log("No reports found to delete.");
  }
}
test();
