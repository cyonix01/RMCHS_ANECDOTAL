const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// import AdminPasswordsModal
code = code.replace(/import \{ SignatorySettingsModal \} from "\.\/SignatorySettingsModal";/, 
`import { SignatorySettingsModal } from "./SignatorySettingsModal";
import { AdminPasswordsModal } from "./AdminPasswordsModal";`);

// add state
code = code.replace(/const \[showSignatorySettingsModal, setShowSignatorySettingsModal\] = useState\(false\);/,
`const [showSignatorySettingsModal, setShowSignatorySettingsModal] = useState(false);
  const [showAdminPasswordsModal, setShowAdminPasswordsModal] = useState(false);`);

// add button in admin menu
const signatoryBtn = `                    <button
                      onClick={() => {
                        setShowSignatorySettingsModal(true);
                        setShowAdminMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-[#102604] uppercase tracking-wider transition-colors border-t border-slate-100"
                    >
                      <UserCheck size={14} className="text-orange-500" />
                      <span>Signatories</span>
                    </button>`;

const newSignatoryBtn = `                    <button
                      onClick={() => {
                        setShowSignatorySettingsModal(true);
                        setShowAdminMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-[#102604] uppercase tracking-wider transition-colors border-t border-slate-100"
                    >
                      <UserCheck size={14} className="text-orange-500" />
                      <span>Signatories</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAdminPasswordsModal(true);
                        setShowAdminMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-[#102604] uppercase tracking-wider transition-colors border-t border-slate-100"
                    >
                      <Shield size={14} className="text-blue-500" />
                      <span>Admin Passwords</span>
                    </button>`;

code = code.replace(signatoryBtn, newSignatoryBtn);

// add modal
const signatoryModal = `{showSignatorySettingsModal && (
          <SignatorySettingsModal onClose={() => setShowSignatorySettingsModal(false)} />
        )}`;

const newSignatoryModal = `{showSignatorySettingsModal && (
          <SignatorySettingsModal onClose={() => setShowSignatorySettingsModal(false)} />
        )}
        
        {showAdminPasswordsModal && (
          <AdminPasswordsModal onClose={() => setShowAdminPasswordsModal(false)} />
        )}`;

code = code.replace(signatoryModal, newSignatoryModal);

fs.writeFileSync('src/components/DashboardView.tsx', code);
