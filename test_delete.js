async function test() {
  const res = await fetch('http://localhost:3000/api/reports/1', { method: 'DELETE' });
  console.log(res.status);
  console.log(await res.text());
}
test();
