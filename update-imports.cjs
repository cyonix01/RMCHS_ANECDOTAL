const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const imports = `import React, { useState, useEffect } from 'react';
import { 
  FileText, Users, AlertCircle, CheckCircle, Clock, 
  TrendingUp, TrendingDown, Activity, UserCheck, BookOpen
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { Report, CriticalReport, Student, UserAccount } from '../types';

`;

fs.writeFileSync(file, imports + content);
