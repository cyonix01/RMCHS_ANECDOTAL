const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

code = code.replace(/const gender = student \? student\.gender : 'Unknown';\n\s*if \(gender === 'Male'\) \{\n\s*counts\[issue\]\.Male\+\+;\n\s*\} else if \(gender === 'Female'\) \{\n\s*counts\[issue\]\.Female\+\+;\n\s*\}/g,
\`const sGender = student?.gender?.toLowerCase();
      if (sGender === 'male' || sGender === 'm') {
        counts[issue].Male++;
      } else if (sGender === 'female' || sGender === 'f') {
        counts[issue].Female++;
      }\`);

fs.writeFileSync('src/utils/pdfGenerator.ts', code);
