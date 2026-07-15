const fs = require('fs');
let code = fs.readFileSync('server/database.ts', 'utf8');

const newGetAllStudents = `export async function getAllStudents(): Promise<Student[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return loadLocalStudents();
  }
  try {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from("students").select("*").range(from, from + step - 1);
      if (error) {
        console.error("Supabase read students failure, falling back to local cache:", error);
        return loadLocalStudents();
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < step) {
          break;
        }
      } else {
        break;
      }
      from += step;
    }
    return allData.map(mapSupabaseRowToStudent);
  } catch (err) {
    console.error("Supabase read students exception, falling back to local cache:", err);
    return loadLocalStudents();
  }
}`;

code = code.replace(/export async function getAllStudents\(\): Promise<Student\[\]> \{[\s\S]*?\}\n/, newGetAllStudents + '\n');
fs.writeFileSync('server/database.ts', code);
