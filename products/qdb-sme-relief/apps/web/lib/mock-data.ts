// Mock data for QDB SME Relief Portal prototype
// Replace these with real API calls in production

export const ELIGIBLE_COMPANY = {
  crNumber: "12345",
  companyName: "Al-Noor Trading & Services W.L.L",
  companyNameAr: "شركة النور للتجارة والخدمات ذ.م.م",
  crExpiry: "31/12/2025",
  activity: "General Trading",
  activityAr: "التجارة العامة",
  capital: "QAR 500,000",
  status: "Active",
  statusAr: "نشطة",
  authorizedSignatory: "Mohammed Ali Al-Thani",
  authorizedSignatoryAr: "محمد علي الثاني",
  employees: 47,
  registrationDate: "15/03/2018",
  isEligible: true,
};

export const INELIGIBLE_COMPANY = {
  crNumber: "99887",
  companyName: "Gulf Horizon Enterprises W.L.L",
  companyNameAr: "مؤسسة أفق الخليج ذ.م.م",
  crExpiry: "15/06/2023",
  activity: "Real Estate",
  activityAr: "العقارات",
  capital: "QAR 2,000,000",
  status: "Expired",
  statusAr: "منتهية الصلاحية",
  authorizedSignatory: "Khalid Ibrahim Al-Mahmoud",
  authorizedSignatoryAr: "خالد إبراهيم المحمود",
  employees: 8,
  registrationDate: "20/09/2020",
  isEligible: false,
};

export interface EligibilityCriterion {
  criterion: string;
  criterionAr: string;
  met: boolean;
  reason?: string;
  reasonAr?: string;
}

export const ELIGIBLE_CRITERIA: EligibilityCriterion[] = [
  {
    criterion: "Active Commercial Registration",
    criterionAr: "سجل تجاري ساري المفعول",
    met: true,
  },
  {
    criterion: "Company registered before 01/01/2024",
    criterionAr: "الشركة مسجلة قبل 01/01/2024",
    met: true,
  },
  {
    criterion: "SME classification (< 250 employees)",
    criterionAr: "تصنيف المنشأة الصغيرة والمتوسطة (أقل من 250 موظف)",
    met: true,
  },
  {
    criterion: "Operating in Qatar",
    criterionAr: "العمل في قطر",
    met: true,
  },
  {
    criterion: "No existing QDB non-performing loans",
    criterionAr: "لا توجد قروض متعثرة لدى بنك قطر للتنمية",
    met: true,
  },
  {
    criterion: "Sector: General Trading (covered)",
    criterionAr: "القطاع: التجارة العامة (مشمول)",
    met: true,
  },
];

export const INELIGIBLE_CRITERIA: EligibilityCriterion[] = [
  {
    criterion: "Active Commercial Registration",
    criterionAr: "سجل تجاري ساري المفعول",
    met: false,
    reason: "CR expired on 15/06/2023",
    reasonAr: "انتهى السجل التجاري في 15/06/2023",
  },
  {
    criterion: "Company registered before 01/01/2024",
    criterionAr: "الشركة مسجلة قبل 01/01/2024",
    met: true,
  },
  {
    criterion: "SME classification (< 250 employees)",
    criterionAr: "تصنيف المنشأة الصغيرة والمتوسطة (أقل من 250 موظف)",
    met: true,
  },
  {
    criterion: "Operating in Qatar",
    criterionAr: "العمل في قطر",
    met: true,
  },
  {
    criterion: "No existing QDB non-performing loans",
    criterionAr: "لا توجد قروض متعثرة لدى بنك قطر للتنمية",
    met: false,
    reason: "Existing NPL balance: QAR 120,000",
    reasonAr: "رصيد القروض المتعثرة الحالي: 120,000 ريال قطري",
  },
  {
    criterion: "Sector: Real Estate (not covered in current cycle)",
    criterionAr: "القطاع: العقارات (غير مشمول في الدورة الحالية)",
    met: false,
    reason: "Real estate sector excluded from current relief program",
    reasonAr: "قطاع العقارات مستبعد من برنامج الإغاثة الحالي",
  },
];

export const WPS_VALIDATION_RESULT = {
  employeesVerified: 47,
  lastPayroll: "November 2024",
  lastPayrollAr: "نوفمبر 2024",
  totalSalaryBurden: "QAR 287,500/month",
  totalSalaryBurdenAr: "287,500 ريال قطري/شهر",
  complianceStatus: "Compliant",
  complianceStatusAr: "متوافق",
};

export const RENT_VALIDATION_RESULT = {
  rentAmount: "QAR 45,000/month",
  rentAmountAr: "45,000 ريال قطري/شهر",
  leaseEndDate: "31/12/2026",
  location: "Industrial Area, Zone 57, Doha",
  locationAr: "المنطقة الصناعية، المنطقة 57، الدوحة",
  status: "Accepted",
  statusAr: "مقبول",
};

export const APPLICATION_REFERENCE = "QDB-RELIEF-2025-00847";

export const STATUS_TIMELINE = [
  {
    step: "Application Submitted",
    stepAr: "تم تقديم الطلب",
    date: "15 Dec 2024",
    dateAr: "15 ديسمبر 2024",
    status: "completed",
  },
  {
    step: "Documents Verified",
    stepAr: "تم التحقق من المستندات",
    date: "16 Dec 2024",
    dateAr: "16 ديسمبر 2024",
    status: "completed",
  },
  {
    step: "Eligibility Confirmed",
    stepAr: "تم تأكيد الأهلية",
    date: "16 Dec 2024",
    dateAr: "16 ديسمبر 2024",
    status: "completed",
  },
  {
    step: "Disbursement Processing",
    stepAr: "جاري معالجة الصرف",
    date: "",
    dateAr: "",
    status: "in-progress",
  },
  {
    step: "Funds Transferred",
    stepAr: "تم تحويل الأموال",
    date: "",
    dateAr: "",
    status: "pending",
  },
];

export const ADMIN_STATS = {
  totalApplications: 1247,
  autoDisburse: 892,
  manualReview: 355,
  disbursed: 743,
};

export type ApplicationStatus =
  | "auto-processing"
  | "manual-review"
  | "disbursed"
  | "rejected"
  | "pending";

export interface AdminApplication {
  id: string;
  crNumber: string;
  companyName: string;
  submittedDate: string;
  status: ApplicationStatus;
  disbursementType: "auto" | "manual";
  amount: string;
  relationshipManager?: string;
}

export const ADMIN_APPLICATIONS: AdminApplication[] = [
  {
    id: "QDB-RELIEF-2025-00847",
    crNumber: "12345",
    companyName: "Al-Noor Trading & Services W.L.L",
    submittedDate: "15 Dec 2024",
    status: "auto-processing",
    disbursementType: "auto",
    amount: "QAR 150,000",
  },
  {
    id: "QDB-RELIEF-2025-00846",
    crNumber: "67891",
    companyName: "Doha Gulf Enterprises LLC",
    submittedDate: "14 Dec 2024",
    status: "disbursed",
    disbursementType: "auto",
    amount: "QAR 200,000",
  },
  {
    id: "QDB-RELIEF-2025-00845",
    crNumber: "54321",
    companyName: "Al-Rayyan Food Industries W.L.L",
    submittedDate: "13 Dec 2024",
    status: "manual-review",
    disbursementType: "manual",
    amount: "QAR 350,000",
    relationshipManager: "Ahmed Al-Dosari",
  },
  {
    id: "QDB-RELIEF-2025-00844",
    crNumber: "11223",
    companyName: "Qatar Tech Solutions Co.",
    submittedDate: "13 Dec 2024",
    status: "disbursed",
    disbursementType: "auto",
    amount: "QAR 180,000",
  },
  {
    id: "QDB-RELIEF-2025-00843",
    crNumber: "44556",
    companyName: "Pearl Construction & Contracting",
    submittedDate: "12 Dec 2024",
    status: "manual-review",
    disbursementType: "manual",
    amount: "QAR 500,000",
    relationshipManager: "Fatima Al-Kuwari",
  },
  {
    id: "QDB-RELIEF-2025-00842",
    crNumber: "78901",
    companyName: "Al-Meera Retail W.L.L",
    submittedDate: "11 Dec 2024",
    status: "disbursed",
    disbursementType: "auto",
    amount: "QAR 220,000",
  },
  {
    id: "QDB-RELIEF-2025-00841",
    crNumber: "33445",
    companyName: "Lusail Hospitality Group",
    submittedDate: "10 Dec 2024",
    status: "rejected",
    disbursementType: "manual",
    amount: "QAR 400,000",
    relationshipManager: "Mohammed Al-Emadi",
  },
  {
    id: "QDB-RELIEF-2025-00840",
    crNumber: "99001",
    companyName: "Gulf Logistics & Transport Co.",
    submittedDate: "09 Dec 2024",
    status: "pending",
    disbursementType: "auto",
    amount: "QAR 130,000",
  },
  {
    id: "QDB-RELIEF-2025-00839",
    crNumber: "22334",
    companyName: "Dafna Healthcare Services W.L.L",
    submittedDate: "08 Dec 2024",
    status: "disbursed",
    disbursementType: "manual",
    amount: "QAR 275,000",
    relationshipManager: "Sara Al-Nasr",
  },
  {
    id: "QDB-RELIEF-2025-00838",
    crNumber: "55667",
    companyName: "Al-Wakra Agri-Products LLC",
    submittedDate: "07 Dec 2024",
    status: "auto-processing",
    disbursementType: "auto",
    amount: "QAR 160,000",
  },
];

export const APPLICATION_STEPS = [
  { key: "login", label: "Login", labelAr: "تسجيل الدخول" },
  { key: "company", label: "Company Verification", labelAr: "التحقق من الشركة" },
  { key: "eligibility", label: "Eligibility", labelAr: "الأهلية" },
  { key: "documents", label: "Documents", labelAr: "المستندات" },
  { key: "review", label: "Review", labelAr: "المراجعة" },
];
