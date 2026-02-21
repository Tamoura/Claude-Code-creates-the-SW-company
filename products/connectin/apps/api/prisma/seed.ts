/**
 * ConnectIn — Database Seed Script
 *
 * Populates the database with realistic test data:
 *   - 100 users (75 professionals, 20 recruiters, 5 admins)
 *   - 100 profiles with experiences, skills, locations
 *   - ~350 connections (accepted, pending, rejected)
 *   - ~280 posts (Arabic + English mix) with likes & comments
 *   - 40 job listings posted by recruiters
 *   - ~160 job applications
 *   - ~120 saved jobs
 *
 * All users share password: Test1234!
 *
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Data pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES_EN = [
  'Ahmed', 'Sara', 'Mohammed', 'Fatima', 'Omar', 'Layla', 'Ali', 'Nour',
  'Hassan', 'Maha', 'Khalid', 'Rania', 'Tariq', 'Dina', 'Youssef', 'Hana',
  'Faisal', 'Amira', 'Bilal', 'Sana', 'Ziad', 'Rana', 'Rami', 'Lina',
  'Karim', 'Salma', 'Nasser', 'Maya', 'Samer', 'Aya', 'Waleed', 'Nadine',
  'Ibrahim', 'Rita', 'Adel', 'Mariam', 'Tarek', 'Yasmine', 'Wael', 'Ghada',
  'Hossam', 'Nadia', 'Maher', 'Soha', 'Sherif', 'Reem', 'Samir', 'Heba',
  'Ayman', 'Dana', 'Khaled', 'Mona', 'Amr', 'Iman', 'Bassem', 'Noura',
  'Hazem', 'Doaa', 'Mostafa', 'Reham', 'Ashraf', 'Abeer', 'Emad', 'Shireen',
  'Magdy', 'Enas', 'Alaa', 'Samia', 'Tamer', 'Hala', 'Ehab', 'Lamia',
  'Shady', 'Rasha', 'Hany', 'Nadia', 'Walid', 'Safaa', 'Gamal', 'Dalia',
  'Maged', 'Niveen', 'Atef', 'Hanan', 'Mahmoud', 'Suha', 'Hesham', 'Nermeen',
  'Ramadan', 'Ola', 'Nabil', 'Asmaa', 'Essam', 'Engy', 'Sameh', 'Marwa',
  'Wissam', 'Celine',
];

const LAST_NAMES = [
  'Al-Rashidi', 'Hassan', 'Al-Mansouri', 'Ibrahim', 'Khalil', 'Al-Ahmad',
  'Nasser', 'Salem', 'Al-Farsi', 'Mahmoud', 'Al-Zahrawi', 'Karimi',
  'Al-Mutairi', 'Farouk', 'Al-Qasimi', 'Younes', 'El-Sayed', 'Barakat',
  'Al-Harbi', 'Zaki', 'Al-Shammari', 'Morsi', 'Al-Dosari', 'Tawfiq',
  'Ghanem', 'Al-Balushi', 'Serhan', 'Al-Otaibi', 'Haddad', 'Saleh',
];

const TECH_COMPANIES = [
  'Careem', 'Souq.com', 'Noon', 'Anghami', 'Fetchr', 'Vezeeta', 'Swvl',
  'Fawry', 'Paymob', 'Instabug', 'Breadfast', 'Trella', 'Bosta', 'Rabbit',
  'Maxab', 'MoneyFellows', 'Khazna', 'Cassbana', 'Taager', 'Wasla',
  'Amazon MENA', 'Microsoft UAE', 'Google Dubai', 'Meta Cairo', 'IBM KSA',
  'Oracle Dubai', 'SAP MENA', 'Cisco Dubai', 'Dell EMC', 'HP Enterprise',
  'Accenture', 'Deloitte Digital', 'McKinsey Digital', 'PwC Tech',
  'Telecom Egypt', 'STC Solutions', 'Mobily', 'Etisalat Digital', 'du',
  'ADNOC Digital', 'Saudi Aramco Digital', 'SABIC Tech', 'Emirates NBD',
  'QNB', 'Riyad Bank Tech', 'Al Rajhi Tech', 'FAB Digital', 'ADIB Tech',
];

const JOB_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Lead Engineer',
  'Frontend Developer', 'Backend Developer', 'Full-Stack Developer',
  'React Developer', 'Node.js Engineer', 'Python Developer',
  'DevOps Engineer', 'SRE', 'Platform Engineer',
  'Data Engineer', 'Data Scientist', 'ML Engineer',
  'Product Manager', 'Senior Product Manager', 'Group PM',
  'Engineering Manager', 'VP Engineering', 'CTO',
  'UI/UX Designer', 'Product Designer', 'Design Lead',
  'QA Engineer', 'SDET', 'Security Engineer',
  'Mobile Developer', 'iOS Developer', 'Android Developer',
  'Cloud Architect', 'Solutions Architect', 'Enterprise Architect',
  'Technical Lead', 'Principal Engineer', 'Staff Engineer',
];

const LOCATIONS = [
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Riyadh, KSA', 'Jeddah, KSA', 'Medina, KSA',
  'Cairo, Egypt', 'Alexandria, Egypt', 'Doha, Qatar', 'Kuwait City, Kuwait',
  'Muscat, Oman', 'Manama, Bahrain', 'Amman, Jordan', 'Beirut, Lebanon',
  'Tunis, Tunisia', 'Casablanca, Morocco', 'Algiers, Algeria',
  'Istanbul, Turkey', 'London, UK', 'Berlin, Germany', 'Remote',
];

const SKILLS = [
  { nameEn: 'TypeScript', nameAr: 'تايبسكريبت', category: 'Programming' },
  { nameEn: 'JavaScript', nameAr: 'جافاسكريبت', category: 'Programming' },
  { nameEn: 'Python', nameAr: 'بايثون', category: 'Programming' },
  { nameEn: 'React', nameAr: 'ريأكت', category: 'Frontend' },
  { nameEn: 'Next.js', nameAr: 'نكست', category: 'Frontend' },
  { nameEn: 'Vue.js', nameAr: 'فيو', category: 'Frontend' },
  { nameEn: 'Node.js', nameAr: 'نود', category: 'Backend' },
  { nameEn: 'Fastify', nameAr: 'فاستيفاي', category: 'Backend' },
  { nameEn: 'Express.js', nameAr: 'إكسبريس', category: 'Backend' },
  { nameEn: 'PostgreSQL', nameAr: 'بوستجريسكيول', category: 'Database' },
  { nameEn: 'MongoDB', nameAr: 'مونغودي بي', category: 'Database' },
  { nameEn: 'Redis', nameAr: 'ريديس', category: 'Database' },
  { nameEn: 'Docker', nameAr: 'دوكر', category: 'DevOps' },
  { nameEn: 'Kubernetes', nameAr: 'كوبيرنيتس', category: 'DevOps' },
  { nameEn: 'AWS', nameAr: 'أمازون ويب سيرفيسز', category: 'Cloud' },
  { nameEn: 'Google Cloud', nameAr: 'جوجل كلاود', category: 'Cloud' },
  { nameEn: 'Azure', nameAr: 'أزور', category: 'Cloud' },
  { nameEn: 'GraphQL', nameAr: 'غراف كيو إل', category: 'API' },
  { nameEn: 'REST APIs', nameAr: 'واجهات REST', category: 'API' },
  { nameEn: 'Machine Learning', nameAr: 'تعلم الآلة', category: 'AI/ML' },
  { nameEn: 'LLMs', nameAr: 'نماذج اللغة الكبيرة', category: 'AI/ML' },
  { nameEn: 'TensorFlow', nameAr: 'تنسرفلو', category: 'AI/ML' },
  { nameEn: 'Product Management', nameAr: 'إدارة المنتج', category: 'Product' },
  { nameEn: 'Agile', nameAr: 'أجايل', category: 'Management' },
  { nameEn: 'Scrum', nameAr: 'سكرم', category: 'Management' },
  { nameEn: 'System Design', nameAr: 'تصميم الأنظمة', category: 'Architecture' },
  { nameEn: 'Microservices', nameAr: 'الخدمات المصغرة', category: 'Architecture' },
  { nameEn: 'iOS Development', nameAr: 'تطوير iOS', category: 'Mobile' },
  { nameEn: 'Android Development', nameAr: 'تطوير أندرويد', category: 'Mobile' },
  { nameEn: 'React Native', nameAr: 'ريأكت نيتف', category: 'Mobile' },
  { nameEn: 'Figma', nameAr: 'فيجما', category: 'Design' },
  { nameEn: 'UI/UX Design', nameAr: 'تصميم واجهات المستخدم', category: 'Design' },
  { nameEn: 'Data Analysis', nameAr: 'تحليل البيانات', category: 'Data' },
  { nameEn: 'SQL', nameAr: 'إس كيو إل', category: 'Database' },
  { nameEn: 'CI/CD', nameAr: 'التكامل المستمر', category: 'DevOps' },
  { nameEn: 'Git', nameAr: 'جيت', category: 'Tools' },
  { nameEn: 'Terraform', nameAr: 'تيرافورم', category: 'DevOps' },
  { nameEn: 'Cybersecurity', nameAr: 'الأمن السيبراني', category: 'Security' },
  { nameEn: 'Arabic NLP', nameAr: 'معالجة اللغة العربية', category: 'AI/ML' },
  { nameEn: 'Blockchain', nameAr: 'البلوك تشين', category: 'Emerging' },
];

const EN_HEADLINES = [
  'Building the future of Arab tech | Full-Stack Engineer',
  'Senior Backend Engineer | Node.js + PostgreSQL | Open to opportunities',
  'Frontend Engineer crafting beautiful UIs | React + TypeScript enthusiast',
  'DevOps Engineer | Kubernetes | AWS | Automation advocate',
  'Product Manager driving growth at scale | Ex-Careem | MENA tech',
  'Data Engineer turning raw data into insights | Python | Spark | dbt',
  'ML Engineer building Arabic NLP solutions | LLMs | TensorFlow',
  'Mobile Developer | React Native | iOS | Android | 5+ apps shipped',
  'Engineering Manager | Building high-performance teams | Ex-Souq',
  'UX Designer focused on accessibility and Arabic-first experiences',
  'Cloud Architect | AWS Certified | Designing resilient systems',
  'Security Engineer | OWASP | Penetration testing | Secure SDLC',
  'Full-Stack Developer | Open source contributor | JS ecosystem',
  'Principal Engineer | System design | High-scale distributed systems',
  'CTO & Co-founder | Serial entrepreneur | MENA tech ecosystem builder',
  'Technical Lead | Fintech | Payments | Banking APIs | PCI-DSS',
  'QA Engineer | SDET | Test automation | Cypress + Playwright',
  'Blockchain Developer | Web3 | Smart contracts | DeFi protocols',
  'Senior iOS Developer | Swift | Objective-C | 10M+ downloads',
  'Data Scientist | Predictive modeling | Arabic text analytics',
  'Backend Engineer | Microservices | Event-driven architecture | Kafka',
  'React Developer | Performance optimization | Core Web Vitals',
  'Platform Engineer | Internal developer platforms | GitOps',
  'Solutions Architect | Digital transformation | Legacy modernization',
  'Staff Engineer | Technical strategy | Cross-org alignment | Ex-Amazon',
];

const AR_HEADLINES = [
  'مهندس برمجيات متكامل | أبني مستقبل التكنولوجيا العربية',
  'مهندس خلفية أول | Node.js | PostgreSQL | منفتح على الفرص',
  'مطور واجهات أمامية | React | TypeScript | شغوف بتجربة المستخدم',
  'مهندس DevOps | Kubernetes | AWS | أتمتة العمليات',
  'مدير منتج أقود النمو على نطاق واسع | خبرة في كريم | تقنية الشرق الأوسط',
  'مهندس بيانات أحول البيانات الخام إلى رؤى | Python | Spark',
  'مهندس تعلم الآلة | حلول معالجة اللغة العربية | نماذج كبيرة',
  'مطور تطبيقات موبايل | React Native | iOS | Android',
  'مدير هندسة | أبني فرقًا عالية الأداء | خبرة في سوق',
  'مصمم UX متخصص في تجارب المستخدم العربية والوصولية',
  'معماري سحابي | AWS Certified | أصمم أنظمة متينة',
  'مهندس أمن معلومات | OWASP | اختبار الاختراق | SDLC آمن',
  'مطور Full-Stack | مساهم في المصدر المفتوح | نظام JavaScript',
  'مهندس رئيسي | تصميم الأنظمة | أنظمة موزعة عالية الأداء',
  'مدير تقني ومؤسس مشارك | رائد أعمال | بناء النظام التقني العربي',
];

const EN_POSTS = [
  `Just shipped a new feature that reduced our API response time by 60%. The key? Moving from N+1 queries to a single optimized JOIN with proper indexing. Sometimes the old solutions are the best ones. #Engineering #Performance #PostgreSQL`,
  `Hot take: Most "microservices" are actually distributed monoliths. You've split your code but not your data. True microservices own their data. Everything else is just expensive HTTP calls. #SoftwareArchitecture #Microservices`,
  `3 years ago I couldn't write a recursive function. Today I shipped a distributed caching layer that handles 50k req/s. If you're just starting out — keep going. The gap between where you are and where you want to be closes faster than you think. 🚀`,
  `Arabic NLP is 10 years behind English NLP. Not because Arab engineers aren't talented — they absolutely are — but because the training data isn't there. This is the biggest opportunity in Arab tech right now. Who's working on this?`,
  `Resume tip for MENA engineers: List your impact, not your tasks. ❌ "Built REST APIs" ✅ "Reduced checkout abandonment by 23% by redesigning the payment API flow" Numbers matter. Context matters. #CareerAdvice #Tech`,
  `The best architecture decision I made this year: choosing boredom over excitement. We went with PostgreSQL + Redis instead of a fancy new graph DB. It's working perfectly. Choose boring technology when the business risk is real. #SystemDesign`,
  `Just got my AWS Solutions Architect certification after 3 months of studying. The exam is tough but fair. Happy to share my study resources with anyone preparing. Drop a comment! #AWS #CloudComputing #Certification`,
  `Something I wish someone had told me earlier: "Senior" isn't about how much code you write. It's about how much code you prevent from being written. Best engineers I know delete more than they add. #SoftwareEngineering`,
  `My team just hit 99.99% uptime for 6 months straight. Here's our stack: • Fastify for the API • PostgreSQL with read replicas • Redis for caching + rate limiting • Health checks every 30 seconds • On-call rotation with 5-minute SLA The details matter. #Reliability #SRE`,
  `Controversial opinion: TypeScript is not "just JavaScript with types." It fundamentally changes how you think about your code. The type system forces you to model your domain correctly. Once you go typed, you never go back. #TypeScript`,
  `To every junior developer in MENA: the global remote job market is open to you. Companies in the US and EU are actively hiring Arab engineers. Your time zone is actually an advantage — you overlap with both Asia and Europe. Apply. #RemoteWork #MENA`,
  `We A/B tested two onboarding flows for our app. Flow A had 8 steps. Flow B had 3 steps with smart defaults. Flow B had 340% higher completion. Users don't read instructions. Design for that reality. #ProductManagement #UX`,
  `Lesson from scaling to 1M users: Your biggest bottleneck is almost never what you think it is. Profile before you optimize. We spent 2 weeks optimizing our Redis cache when the actual slowdown was a missing database index. #Performance #Backend`,
  `Built my first open-source library yesterday! Arabic date formatter that handles Hijri/Gregorian conversion with proper RTL formatting. Check it out — PRs welcome! #OpenSource #Arabic #JavaScript`,
  `Interview tip: When they ask "tell me about a time you failed" — they're not looking for a story about a typo. They want to know if you can identify root causes, take ownership, and learn systematically. Have 2-3 real failure stories ready. #Interviews #Career`,
  `The Arab tech ecosystem is maturing fast. 5 years ago, most tech talent left for opportunities abroad. Now the best engineers are choosing to stay and build here. Careem, Noon, Fawry, Instabug — these are world-class companies built in the region. Proud to be part of it. 🌙`,
  `Code review philosophy I follow: Comment on the code, never on the person. "This function has 3 responsibilities" not "you wrote a messy function." Psychological safety is more important than being right. #CodeReview #Engineering #Culture`,
  `PSA: If your API returns a 200 OK with an error message in the body, you're doing REST wrong. Use proper HTTP status codes. Your API consumers will thank you. #API #WebDevelopment`,
  `Built a real-time notification system last quarter. Learnings: 1. WebSockets are great until they're not 2. Always have a polling fallback 3. Message deduplication is harder than it looks 4. Your clients will reconnect constantly — handle it gracefully #Backend #RealTime`,
  `The most impactful thing I did for my team's productivity wasn't technical. It was creating a "no Slack notifications between 6pm-9am" policy. Deep work is a feature, not a luxury. #Engineering #Culture #WorkLifeBalance`,
];

const AR_POSTS = [
  `للتو أطلقنا ميزة جديدة خفّضت زمن استجابة API لدينا بنسبة 60%. السر؟ الانتقال من استعلامات N+1 إلى JOIN محسّن مع فهرسة صحيحة. أحيانًا الحلول القديمة هي الأفضل. #هندسة_البرمجيات #الأداء`,
  `رأي جريء: معظم ما يسمى بـ "الخدمات المصغرة" هي في الواقع مونوليث موزعة. قسّمت الكود لكن ليس البيانات. الخدمات المصغرة الحقيقية تمتلك بياناتها الخاصة. كل شيء آخر مجرد HTTP calls مكلفة. #معمارية_البرمجيات`,
  `قبل 3 سنوات لم أكن أستطيع كتابة دالة تكرارية. اليوم أطلقت طبقة تخزين مؤقت موزعة تتحمل 50 ألف طلب في الثانية. إذا كنت في البداية — استمر. الفجوة بين أين أنت وأين تريد أن تكون تضيق أسرع مما تتوقع. 🚀`,
  `معالجة اللغة الطبيعية للعربية متأخرة 10 سنوات عن الإنجليزية. ليس لأن المهندسين العرب أقل موهبة — بل لأن بيانات التدريب غير متوفرة. هذه أكبر فرصة في التقنية العربية الآن. من يعمل على هذا؟`,
  `نصيحة للمهندسين في المنطقة: اكتب تأثيرك لا مهامك. ❌ "بنيت REST APIs" ✅ "قللت التخلي عن الدفع بنسبة 23% بإعادة تصميم تدفق API الدفع" الأرقام مهمة. السياق مهم. #نصائح_مهنية`,
  `أفضل قرار معماري اتخذته هذا العام: اخترت الملل على الإثارة. ذهبنا بـ PostgreSQL و Redis بدلًا من قاعدة بيانات الرسوم البيانية الجديدة الرائعة. يعمل بشكل مثالي. اختر التكنولوجيا الممتعة عندما يكون خطر الأعمال حقيقيًا. #تصميم_الأنظمة`,
  `حصلت للتو على شهادة AWS Solutions Architect بعد 3 أشهر من الدراسة. الامتحان صعب لكن عادل. يسعدني مشاركة مصادر الدراسة مع أي شخص يستعد. اترك تعليقًا! #AWS #الحوسبة_السحابية`,
  `شيء أتمنى أن يخبرني أحد به مبكرًا: "كبير" لا يتعلق بكمية الكود الذي تكتبه. يتعلق بكمية الكود الذي تمنع كتابته. أفضل المهندسين الذين أعرفهم يحذفون أكثر مما يضيفون. #هندسة_البرمجيات`,
  `فريقي حقق 99.99% uptime لمدة 6 أشهر متواصلة. المكدس الخاص بنا: Fastify للـ API، PostgreSQL مع read replicas، Redis للتخزين المؤقت وتحديد المعدل، فحوصات الصحة كل 30 ثانية، on-call rotation مع SLA 5 دقائق. التفاصيل مهمة. #الموثوقية`,
  `يجب على كل مطوّر في المنطقة العربية أن يعلم: سوق العمل عن بُعد العالمي مفتوح لك. الشركات الأمريكية والأوروبية تُوظّف مهندسين عرب بنشاط. منطقتك الزمنية ميزة فعلية — تتداخل مع آسيا وأوروبا. قدّم طلبك. #العمل_عن_بُعد`,
];

const COMMENTS_EN = [
  'Great insight! This is exactly the kind of practical wisdom that gets lost in tutorials.',
  'Couldn\'t agree more. We made the exact same mistake and it cost us 3 weeks.',
  'Saving this for my next architecture review meeting.',
  'This is gold. Forwarding to my entire team right now.',
  'Totally agree. The hype cycle is real, and boring technology wins every time.',
  'Question: how did you handle the database migration? That\'s always our bottleneck.',
  'This is the content I come here for. More of this please.',
  'Would love to chat more about this. Sending a connection request!',
  'Real talk. I see so many engineers chase shiny new tools when the fundamentals would solve 90% of problems.',
  'Excellent point. Just bookmarked this.',
  'How long did it take to see the improvement? We\'re dealing with the same issue.',
  'The Arabic NLP point is so important. We need more annotated datasets.',
  'Needed to hear this today. Back to basics.',
  'Can you share more details about the indexing strategy you used?',
  'This is exactly why I follow you. Straight to the point, no hype.',
];

const COMMENTS_AR = [
  'رائع! هذه بالضبط نوع الحكمة العملية التي تضيع في الدروس التعليمية.',
  'لا يمكنني الموافقة أكثر. ارتكبنا نفس الخطأ وكلفتنا 3 أسابيع.',
  'سأحفظ هذا لاجتماع مراجعة المعمارية القادم.',
  'هذا ذهب. سأعيد توجيهه إلى فريقي كاملًا الآن.',
  'أتفق تمامًا. دورة الضجة حقيقية، والتكنولوجيا الممتعة تفوز في كل مرة.',
  'سؤال: كيف تعاملت مع ترحيل قاعدة البيانات؟ هذا دائمًا اختناقنا.',
  'هذا هو المحتوى الذي أأتي إليه هنا. المزيد من هذا من فضلك.',
  'يسعدني التحدث أكثر عن هذا. سأرسل طلب اتصال!',
  'النقطة العربية NLP مهمة جدًا. نحتاج المزيد من مجموعات البيانات الموسومة.',
  'احتجت إلى سماع هذا اليوم. العودة إلى الأساسيات.',
];

const JOB_LISTINGS = [
  {
    title: 'Senior Backend Engineer',
    description: 'We are looking for a Senior Backend Engineer to join our core platform team. You will design and build high-throughput APIs serving millions of users across the MENA region. You will work with a modern stack (Node.js, PostgreSQL, Redis, Kafka) and have significant autonomy over technical decisions.',
    requirements: '5+ years of backend engineering experience\nStrong proficiency in Node.js or Python\nExperience with PostgreSQL and query optimization\nFamiliarity with distributed systems and microservices\nExperience with cloud platforms (AWS or GCP)\nStrong communication skills in English (Arabic is a plus)',
    workType: 'HYBRID' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 25000, salaryMax: 35000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'React Frontend Developer',
    description: 'Join our product team to build world-class web experiences for Arab professionals. You will be responsible for implementing pixel-perfect UIs with a strong focus on RTL support, performance, and accessibility. We ship weekly and move fast.',
    requirements: '3+ years of React development\nStrong TypeScript skills\nExperience with RTL layouts and Arabic text rendering\nKnowledge of performance optimization techniques\nFamiliarity with testing (Jest, React Testing Library)\nEye for design and UX detail',
    workType: 'REMOTE' as const,
    experienceLevel: 'MID' as const,
    salaryMin: 12000, salaryMax: 18000, salaryCurrency: 'USD',
    location: null,
  },
  {
    title: 'Machine Learning Engineer',
    description: 'We are building Arabic NLP capabilities from scratch. As an ML Engineer, you will develop and train models for Arabic text classification, sentiment analysis, and entity recognition. You will work closely with our data team and product team to ship AI features that actually work in Arabic.',
    requirements: 'Strong Python skills\nExperience with PyTorch or TensorFlow\nBackground in NLP (Arabic NLP experience is a major plus)\nAbility to fine-tune LLMs\nFamiliarity with MLflow or similar experiment tracking\nPublished research is a strong plus',
    workType: 'HYBRID' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 30000, salaryMax: 45000, salaryCurrency: 'SAR',
    location: 'Riyadh, KSA',
  },
  {
    title: 'DevOps / Platform Engineer',
    description: 'We need a DevOps Engineer to own our infrastructure and CI/CD pipelines. You will manage our Kubernetes clusters on AWS EKS, define infrastructure as code with Terraform, and build internal developer tooling. This is a hands-on role with a strong focus on reliability and developer experience.',
    requirements: '4+ years of DevOps/Platform engineering\nStrong Kubernetes skills\nTerraform or Pulumi experience\nAWS or GCP expertise\nExperience with GitOps (ArgoCD or Flux)\nSecurity mindset (SOC2, ISO27001 knowledge is a plus)',
    workType: 'REMOTE' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 20000, salaryMax: 30000, salaryCurrency: 'USD',
    location: 'Remote',
  },
  {
    title: 'Product Manager — Growth',
    description: 'We are hiring a Product Manager to own our user growth and activation loops. You will run continuous experiments, analyze cohort data, work with marketing and engineering to design viral growth mechanics. You should be data-driven, product-obsessed, and deeply empathetic to Arab professionals\' career needs.',
    requirements: '4+ years of product management experience\nStrong analytical skills (SQL, Mixpanel, Amplitude)\nExperience running A/B tests at scale\nExcellent communication and stakeholder management\nArabic language skills preferred\nExperience in consumer social products is a strong plus',
    workType: 'ONSITE' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 25000, salaryMax: 40000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'Junior Frontend Developer',
    description: 'Kickstart your career building products used by hundreds of thousands of Arab professionals. As a Junior Frontend Developer, you will work alongside senior engineers, implement UI components from Figma designs, write tests, and gradually take ownership of features. We invest heavily in junior talent.',
    requirements: '1+ years of React experience\nBasic TypeScript knowledge\nFamiliarity with Git\nStrong desire to learn and grow\nArabic language skills preferred\nAny personal projects or open-source contributions are a big plus',
    workType: 'HYBRID' as const,
    experienceLevel: 'ENTRY' as const,
    salaryMin: 8000, salaryMax: 12000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'Data Engineer',
    description: 'Build the data infrastructure that powers ConnectIn\'s personalization and analytics. You will design and maintain our data pipelines (Kafka → Spark → dbt → Snowflake), build data models for our analytics team, and ensure data quality across the platform.',
    requirements: '3+ years of data engineering experience\nStrong SQL skills\nPython proficiency\nExperience with Spark or Flink\ndbt experience is a strong plus\nFamiliarity with data modeling and dimensional modeling',
    workType: 'HYBRID' as const,
    experienceLevel: 'MID' as const,
    salaryMin: 20000, salaryMax: 30000, salaryCurrency: 'SAR',
    location: 'Riyadh, KSA',
  },
  {
    title: 'Engineering Manager',
    description: 'Lead a team of 6-8 engineers building our core networking features. You will manage career growth, run effective agile ceremonies, own quarterly OKRs, and collaborate with product and design. You should be someone who codes occasionally but thrives on team impact.',
    requirements: '2+ years of engineering management experience\n6+ years of software engineering experience\nExperience managing distributed/remote teams\nStrong execution and delivery track record\nCoaching and mentoring skills\nArabic language skills strongly preferred',
    workType: 'HYBRID' as const,
    experienceLevel: 'LEAD' as const,
    salaryMin: 40000, salaryMax: 55000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'iOS Developer',
    description: 'Build the ConnectIn iOS app from scratch. We are a mobile-first company targeting Arab professionals on iPhone. You will own the entire iOS experience — from the SwiftUI components to the Combine data layer to App Store submission. High autonomy, high ownership.',
    requirements: '4+ years of iOS development\nStrong SwiftUI skills\nExperience with Combine or async/await\nFamiliarity with design systems and accessibility\nApp Store submission experience\nArabic language skills are a plus',
    workType: 'REMOTE' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 18000, salaryMax: 25000, salaryCurrency: 'USD',
    location: null,
  },
  {
    title: 'Security Engineer',
    description: 'Own the security posture of a platform handling sensitive professional data for hundreds of thousands of users. You will conduct security reviews, run penetration tests, build security automation into CI/CD, manage our bug bounty program, and ensure compliance with GDPR and local data regulations.',
    requirements: '5+ years of security engineering experience\nOffensive security background (OSCP or similar preferred)\nExperience with SAST/DAST tooling\nAPIs and web application security expertise\nFamiliarity with cloud security (AWS Security Hub, GuardDuty)\nCEH, CISSP, or similar certification is a plus',
    workType: 'HYBRID' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 28000, salaryMax: 40000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'UI/UX Designer',
    description: 'Design the future of professional networking for Arab professionals. You will own the ConnectIn design system, conduct user research with Arabic-speaking users, create high-fidelity prototypes in Figma, and work hand-in-hand with engineers to ensure pixel-perfect implementation.',
    requirements: '3+ years of product design experience\nStrong Figma skills\nExperience designing RTL interfaces\nPortfolio demonstrating end-to-end product thinking\nArabic language skills required\nExperience with accessibility (WCAG 2.1)',
    workType: 'HYBRID' as const,
    experienceLevel: 'MID' as const,
    salaryMin: 18000, salaryMax: 25000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'Staff Engineer — Platform',
    description: 'We are searching for a Staff Engineer to set the technical direction for our platform engineering guild. You will define coding standards, lead cross-team architectural decisions, mentor principal and senior engineers, and represent engineering leadership in product planning. This is a technical IC role with company-wide impact.',
    requirements: '10+ years of software engineering experience\nProven track record of technical leadership without direct management\nExperience with large-scale distributed systems\nAbility to communicate complex technical decisions to non-engineers\nOpen-source contributions or public technical writing preferred',
    workType: 'HYBRID' as const,
    experienceLevel: 'EXECUTIVE' as const,
    salaryMin: 50000, salaryMax: 70000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'Backend Engineer — Payments',
    description: 'Join our fintech team building the payment infrastructure for ConnectIn Premium and recruiter subscriptions. You will integrate with regional payment gateways (Checkout.com, Moyasar, PayTabs), build subscription billing logic, and ensure PCI-DSS compliance.',
    requirements: '4+ years of backend engineering\nPayment systems experience (PSP integrations)\nStrong understanding of PCI-DSS requirements\nExperience with idempotency and distributed transactions\nKnowledge of regional payment methods (MADA, STC Pay, etc.)',
    workType: 'REMOTE' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 25000, salaryMax: 35000, salaryCurrency: 'SAR',
    location: 'Riyadh, KSA',
  },
  {
    title: 'Android Developer',
    description: 'Build ConnectIn on Android for millions of Arab professionals using Android devices. You will develop features in Kotlin with Jetpack Compose, integrate with our REST APIs, and ensure the app performs well on the range of devices used across the MENA region.',
    requirements: '3+ years of Android development\nKotlin expertise\nJetpack Compose experience\nFamiliarity with MVVM and Clean Architecture\nExperience with Arabic text rendering on Android\nPlay Store release management experience',
    workType: 'REMOTE' as const,
    experienceLevel: 'MID' as const,
    salaryMin: 14000, salaryMax: 20000, salaryCurrency: 'USD',
    location: null,
  },
  {
    title: 'QA Engineer — Automation',
    description: 'Build and maintain our test automation infrastructure. You will write E2E tests with Playwright, build API test suites with Jest, set up visual regression testing, and define quality gates in our CI/CD pipeline. You will be the last line of defense before every release.',
    requirements: '3+ years of QA automation experience\nPlaywright or Cypress expertise\nExperience with API testing (REST/GraphQL)\nCI/CD integration experience\nUnderstanding of software development lifecycle\nExperience with visual testing tools is a plus',
    workType: 'REMOTE' as const,
    experienceLevel: 'MID' as const,
    salaryMin: 12000, salaryMax: 18000, salaryCurrency: 'USD',
    location: null,
  },
  {
    title: 'Data Scientist — Recommendations',
    description: 'Build the recommendation engine that helps Arab professionals discover the right jobs, connections, and content. You will develop collaborative filtering and content-based models, run offline experiments, and work with engineers to deploy models to production.',
    requirements: '3+ years of applied ML / data science experience\nStrong Python skills (scikit-learn, PyTorch)\nExperience with recommendation systems\nSQL proficiency for feature engineering\nExperience with A/B testing and causal inference\nFamiliarity with Arabic language data is a strong plus',
    workType: 'HYBRID' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 22000, salaryMax: 32000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'Technical Writer',
    description: 'Help engineers, product managers, and developers understand and use ConnectIn\'s APIs and platform. You will write API documentation, developer guides, changelog posts, and internal runbooks. This is a rare technical writing role that actually requires you to be technical.',
    requirements: '3+ years of technical writing experience\nAbility to read and understand code\nExperience writing API documentation (OpenAPI / Swagger)\nStrong English writing skills\nArabic writing skills are a major plus\nFamiliarity with developer tools and modern web development',
    workType: 'REMOTE' as const,
    experienceLevel: 'MID' as const,
    salaryMin: 10000, salaryMax: 15000, salaryCurrency: 'USD',
    location: null,
  },
  {
    title: 'Cloud Infrastructure Engineer',
    description: 'Manage and scale our cloud infrastructure as we grow to millions of users. You will manage our AWS environment (EKS, RDS, ElastiCache, SQS, CloudFront), build monitoring and alerting with Datadog and PagerDuty, and lead our move toward a multi-region setup.',
    requirements: '5+ years of cloud infrastructure experience\nAWS expertise (EKS, RDS, CloudFront essential)\nTerraform / Pulumi for IaC\nObservability tooling (Datadog, Grafana, Prometheus)\nDatabase performance tuning experience\nAWS Professional certification preferred',
    workType: 'REMOTE' as const,
    experienceLevel: 'SENIOR' as const,
    salaryMin: 22000, salaryMax: 32000, salaryCurrency: 'USD',
    location: null,
  },
  {
    title: 'Growth Engineer',
    description: 'A unique hybrid role for an engineer with strong product instincts. You will build growth experiments, implement referral mechanics, optimize conversion funnels, instrument analytics, and work with the data team to measure everything. Half engineer, half product manager.',
    requirements: '4+ years of engineering experience\nExperience building growth experiments and A/B tests\nFamiliarity with analytics tools (Mixpanel, Segment, Amplitude)\nFull-stack skills (Node.js + React preferred)\nStrong product intuition\nStartup experience preferred',
    workType: 'HYBRID' as const,
    experienceLevel: 'MID' as const,
    salaryMin: 20000, salaryMax: 28000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
  {
    title: 'Principal Engineer — AI',
    description: 'Lead the technical strategy for ConnectIn\'s AI features. You will define the architecture for our AI stack (LLM integration, embedding pipelines, RAG systems), mentor ML engineers, evaluate new AI capabilities, and collaborate with product leadership on the AI roadmap.',
    requirements: '8+ years of engineering experience\n3+ years working with LLMs in production\nExperience with vector databases (Pinecone, pgvector, Weaviate)\nStrong Python and systems engineering skills\nAbility to communicate AI capabilities and limitations to business stakeholders\nArabic language understanding is a strong plus',
    workType: 'HYBRID' as const,
    experienceLevel: 'EXECUTIVE' as const,
    salaryMin: 45000, salaryMax: 65000, salaryCurrency: 'AED',
    location: 'Dubai, UAE',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p: number) => Math.random() < p;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 ConnectIn seed starting…\n');

  // Clear existing data (order matters for FK constraints)
  console.log('🗑️  Clearing existing data…');
  await prisma.savedJob.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.job.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profileSkill.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleared\n');

  // ── Skills ──────────────────────────────────────────────────────────────────
  console.log('📚 Creating skills…');
  const createdSkills = await Promise.all(
    SKILLS.map((s) =>
      prisma.skill.create({ data: s })
    )
  );
  console.log(`✅ ${createdSkills.length} skills created\n`);

  // ── Password hash ────────────────────────────────────────────────────────────
  // Use rounds=10 for seed speed (12 is production default)
  const passwordHash = await bcrypt.hash('Test1234!', 10);

  // ── Users ────────────────────────────────────────────────────────────────────
  console.log('👤 Creating 100 users…');

  // Deterministic name assignment (avoid duplicates)
  const usedNames = new Set<string>();
  const generateUniqueName = () => {
    let name: string;
    let tries = 0;
    do {
      const first = FIRST_NAMES_EN[tries < FIRST_NAMES_EN.length
        ? usedNames.size
        : Math.floor(Math.random() * FIRST_NAMES_EN.length)];
      const last = pick(LAST_NAMES);
      name = `${first} ${last}`;
      tries++;
    } while (usedNames.has(name) && tries < 200);
    usedNames.add(name);
    return name;
  };

  type UserRole = 'USER' | 'RECRUITER' | 'ADMIN';
  type LangPref = 'AR' | 'EN';

  const userDefs: Array<{
    email: string;
    displayName: string;
    role: UserRole;
    languagePreference: LangPref;
    emailVerified: boolean;
  }> = [];

  // 5 admins
  for (let i = 0; i < 5; i++) {
    userDefs.push({
      email: `admin${i + 1}@connectin.dev`,
      displayName: generateUniqueName(),
      role: 'ADMIN',
      languagePreference: 'EN',
      emailVerified: true,
    });
  }
  // 20 recruiters
  for (let i = 0; i < 20; i++) {
    userDefs.push({
      email: `recruiter${i + 1}@connectin.dev`,
      displayName: generateUniqueName(),
      role: 'RECRUITER',
      languagePreference: chance(0.5) ? 'AR' : 'EN',
      emailVerified: true,
    });
  }
  // 75 regular users
  for (let i = 0; i < 75; i++) {
    userDefs.push({
      email: `user${i + 1}@connectin.dev`,
      displayName: generateUniqueName(),
      role: 'USER',
      languagePreference: chance(0.6) ? 'AR' : 'EN',
      emailVerified: i < 60, // 15 unverified
    });
  }

  const users = await Promise.all(
    userDefs.map((def) =>
      prisma.user.create({
        data: {
          ...def,
          passwordHash,
          status: 'ACTIVE',
          lastLoginAt: chance(0.7) ? daysAgo(rand(0, 30)) : null,
          createdAt: daysAgo(rand(60, 365)),
        },
      })
    )
  );

  console.log(`✅ ${users.length} users created\n`);

  // ── Profiles ─────────────────────────────────────────────────────────────────
  console.log('🪪 Creating profiles…');

  const profiles = await Promise.all(
    users.map((user, idx) => {
      const useAr = user.languagePreference === 'AR';
      const headlineEn = pick(EN_HEADLINES);
      const headlineAr = useAr ? pick(AR_HEADLINES) : undefined;
      const location = pick(LOCATIONS);
      const score = rand(20, 95);

      return prisma.profile.create({
        data: {
          userId: user.id,
          headlineEn,
          headlineAr: headlineAr ?? null,
          summaryEn: chance(0.7)
            ? `Experienced ${pick(JOB_TITLES)} with a passion for building scalable systems. Based in ${location}, open to opportunities across the MENA region and globally.`
            : null,
          summaryAr: useAr && chance(0.5)
            ? `مهندس متمرس لديه شغف ببناء أنظمة قابلة للتوسع. مقيم في ${location}، منفتح على الفرص في جميع أنحاء منطقة الشرق الأوسط وشمال أفريقيا وعالميًا.`
            : null,
          location: chance(0.85) ? location : null,
          website: chance(0.3) ? `https://github.com/user${idx + 1}` : null,
          completenessScore: score,
          createdAt: daysAgo(rand(30, 300)),
        },
      });
    })
  );

  // Experiences (1-3 per profile)
  console.log('💼 Creating experiences…');
  const expInserts = profiles.flatMap((profile, idx) => {
    const count = rand(1, 3);
    return Array.from({ length: count }, (_, i) => {
      const isCurrent = i === 0;
      const startYear = 2024 - i * rand(2, 3);
      return prisma.experience.create({
        data: {
          profileId: profile.id,
          company: pick(TECH_COMPANIES),
          title: pick(JOB_TITLES),
          location: chance(0.6) ? pick(LOCATIONS) : null,
          description: chance(0.6)
            ? `Led development of core platform features. Reduced latency by ${rand(20, 60)}%, improved test coverage to ${rand(75, 95)}%.`
            : null,
          startDate: new Date(`${startYear}-0${rand(1, 9)}-01`),
          endDate: isCurrent ? null : new Date(`${startYear + rand(1, 2)}-0${rand(1, 9)}-01`),
          isCurrent,
          sortOrder: i,
        },
      });
    });
  });
  await Promise.all(expInserts);
  console.log(`✅ Experiences created\n`);

  // Skills (3-8 per profile)
  console.log('🔧 Assigning skills…');
  const skillInserts = profiles.flatMap((profile) => {
    const count = rand(3, 8);
    const selected = pickN(createdSkills, count);
    return selected.map((skill) =>
      prisma.profileSkill.create({
        data: {
          profileId: profile.id,
          skillId: skill.id,
          endorsementCount: rand(0, 50),
        },
      })
    );
  });
  await Promise.all(skillInserts);
  console.log(`✅ Skills assigned\n`);

  // ── Connections ───────────────────────────────────────────────────────────────
  console.log('🤝 Creating connections…');

  const connectionPairs = new Set<string>();
  const connectionData: Array<{
    senderId: string;
    receiverId: string;
    status: 'ACCEPTED' | 'PENDING' | 'REJECTED';
    createdAt: Date;
    respondedAt: Date | null;
  }> = [];

  // Each user connects with 4-12 others
  for (const user of users) {
    const targetCount = rand(4, 12);
    const candidates = users.filter((u) => u.id !== user.id);
    const targets = pickN(candidates, targetCount);

    for (const target of targets) {
      const key = [user.id, target.id].sort().join(':');
      if (connectionPairs.has(key)) continue;
      connectionPairs.add(key);

      const r = Math.random();
      const status: 'ACCEPTED' | 'PENDING' | 'REJECTED' =
        r < 0.65 ? 'ACCEPTED' : r < 0.85 ? 'PENDING' : 'REJECTED';
      const createdAt = daysAgo(rand(1, 200));

      connectionData.push({
        senderId: user.id,
        receiverId: target.id,
        status,
        createdAt,
        respondedAt: status !== 'PENDING' ? new Date(createdAt.getTime() + rand(1, 7) * 86400000) : null,
      });
    }
  }

  await Promise.all(
    connectionData.map((c) =>
      prisma.connection.create({
        data: {
          senderId: c.senderId,
          receiverId: c.receiverId,
          status: c.status,
          createdAt: c.createdAt,
          respondedAt: c.respondedAt,
        },
      })
    )
  );
  console.log(`✅ ${connectionData.length} connections created\n`);

  // ── Posts ─────────────────────────────────────────────────────────────────────
  console.log('📝 Creating posts…');

  const allPostContent = [
    ...EN_POSTS.map((c) => ({ content: c, textDirection: 'LTR' as const })),
    ...AR_POSTS.map((c) => ({ content: c, textDirection: 'RTL' as const })),
  ];

  // 280 posts spread over 90 days
  const postCreates = Array.from({ length: 280 }, (_, i) => {
    const author = pick(users);
    const postContent = allPostContent[i % allPostContent.length];
    return prisma.post.create({
      data: {
        authorId: author.id,
        content: postContent.content,
        textDirection: postContent.textDirection,
        createdAt: daysAgo(rand(0, 90)),
      },
    });
  });

  const posts = await Promise.all(postCreates);
  console.log(`✅ ${posts.length} posts created\n`);

  // ── Likes ─────────────────────────────────────────────────────────────────────
  console.log('❤️  Creating likes…');

  const likePairs = new Set<string>();
  const likeData: Array<{ postId: string; userId: string }> = [];

  for (const post of posts) {
    const likeCount = rand(2, 30);
    const likers = pickN(users, Math.min(likeCount, users.length));
    for (const liker of likers) {
      const key = `${post.id}:${liker.id}`;
      if (likePairs.has(key)) continue;
      likePairs.add(key);
      likeData.push({ postId: post.id, userId: liker.id });
    }
  }

  // Batch inserts
  for (let i = 0; i < likeData.length; i += 50) {
    const batch = likeData.slice(i, i + 50);
    await Promise.all(
      batch.map((l) => prisma.like.create({ data: l }))
    );
  }

  // Update post likeCount
  const likeCounts = likeData.reduce<Record<string, number>>((acc, l) => {
    acc[l.postId] = (acc[l.postId] ?? 0) + 1;
    return acc;
  }, {});
  await Promise.all(
    Object.entries(likeCounts).map(([postId, count]) =>
      prisma.post.update({ where: { id: postId }, data: { likeCount: count } })
    )
  );
  console.log(`✅ ${likeData.length} likes created\n`);

  // ── Comments ──────────────────────────────────────────────────────────────────
  console.log('💬 Creating comments…');

  const allComments = [
    ...COMMENTS_EN.map((c) => ({ content: c, textDirection: 'LTR' as const })),
    ...COMMENTS_AR.map((c) => ({ content: c, textDirection: 'RTL' as const })),
  ];

  // ~3 comments per post on average, skewed (some posts have many, some none)
  const commentData = posts.flatMap((post) => {
    if (chance(0.2)) return []; // 20% of posts get no comments
    const count = rand(1, 8);
    return Array.from({ length: count }, () => {
      const author = pick(users);
      const c = pick(allComments);
      return { postId: post.id, authorId: author.id, content: c.content, textDirection: c.textDirection };
    });
  });

  for (let i = 0; i < commentData.length; i += 50) {
    const batch = commentData.slice(i, i + 50);
    await Promise.all(batch.map((c) => prisma.comment.create({ data: c })));
  }

  // Update post commentCount
  const commentCounts = commentData.reduce<Record<string, number>>((acc, c) => {
    acc[c.postId] = (acc[c.postId] ?? 0) + 1;
    return acc;
  }, {});
  await Promise.all(
    Object.entries(commentCounts).map(([postId, count]) =>
      prisma.post.update({ where: { id: postId }, data: { commentCount: count } })
    )
  );
  console.log(`✅ ${commentData.length} comments created\n`);

  // ── Jobs ──────────────────────────────────────────────────────────────────────
  console.log('💼 Creating job listings…');

  const recruiters = users.filter((u) => u.role === 'RECRUITER');
  const jobs = await Promise.all(
    JOB_LISTINGS.map((listing, i) => {
      const recruiter = recruiters[i % recruiters.length];
      return prisma.job.create({
        data: {
          recruiterId: recruiter.id,
          title: listing.title,
          company: pick(TECH_COMPANIES),
          location: listing.location ?? null,
          workType: listing.workType,
          experienceLevel: listing.experienceLevel,
          description: listing.description,
          requirements: listing.requirements,
          salaryMin: listing.salaryMin,
          salaryMax: listing.salaryMax,
          salaryCurrency: listing.salaryCurrency,
          language: 'en',
          status: chance(0.85) ? 'OPEN' : 'CLOSED',
          createdAt: daysAgo(rand(1, 60)),
        },
      });
    })
  );
  console.log(`✅ ${jobs.length} jobs created\n`);

  // ── Job Applications ──────────────────────────────────────────────────────────
  console.log('📨 Creating job applications…');

  const regularUsers = users.filter((u) => u.role === 'USER');
  const appPairs = new Set<string>();
  const appData: Array<{
    jobId: string;
    applicantId: string;
    coverNote?: string;
    status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED';
  }> = [];

  for (const job of jobs) {
    const applicantCount = rand(3, 15);
    const applicants = pickN(regularUsers, Math.min(applicantCount, regularUsers.length));
    for (const applicant of applicants) {
      const key = `${job.id}:${applicant.id}`;
      if (appPairs.has(key)) continue;
      appPairs.add(key);

      const r = Math.random();
      const status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED' =
        r < 0.45 ? 'PENDING' : r < 0.65 ? 'REVIEWED' : r < 0.8 ? 'SHORTLISTED' : 'REJECTED';

      appData.push({
        jobId: job.id,
        applicantId: applicant.id,
        coverNote: chance(0.6)
          ? `I am very interested in this ${job.title} role. I bring ${rand(2, 8)} years of relevant experience and am excited about the mission.`
          : undefined,
        status,
      });
    }
  }

  await Promise.all(
    appData.map((a) =>
      prisma.jobApplication.create({
        data: {
          jobId: a.jobId,
          applicantId: a.applicantId,
          coverNote: a.coverNote ?? null,
          status: a.status,
        },
      })
    )
  );

  // Update applicantCount on jobs
  const appCounts = appData.reduce<Record<string, number>>((acc, a) => {
    acc[a.jobId] = (acc[a.jobId] ?? 0) + 1;
    return acc;
  }, {});
  await Promise.all(
    Object.entries(appCounts).map(([jobId, count]) =>
      prisma.job.update({ where: { id: jobId }, data: { applicantCount: count } })
    )
  );
  console.log(`✅ ${appData.length} applications created\n`);

  // ── Saved Jobs ────────────────────────────────────────────────────────────────
  console.log('🔖 Creating saved jobs…');

  const savedPairs = new Set<string>();
  const savedData: Array<{ jobId: string; userId: string }> = [];

  for (const user of regularUsers) {
    const saveCount = rand(0, 6);
    const toSave = pickN(jobs, saveCount);
    for (const job of toSave) {
      const key = `${job.id}:${user.id}`;
      if (savedPairs.has(key)) continue;
      savedPairs.add(key);
      savedData.push({ jobId: job.id, userId: user.id });
    }
  }

  await Promise.all(
    savedData.map((s) => prisma.savedJob.create({ data: s }))
  );
  console.log(`✅ ${savedData.length} saved jobs created\n`);

  // ── Consents ──────────────────────────────────────────────────────────────────
  console.log('📋 Creating consents…');

  const consentTypes = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'DATA_PROCESSING'] as const;
  const consentInserts = users.flatMap((user) =>
    consentTypes.map((type) =>
      prisma.consent.create({
        data: {
          userId: user.id,
          type,
          granted: true,
          version: '1.0',
          grantedAt: user.createdAt,
        },
      })
    )
  );
  await Promise.all(consentInserts);
  console.log(`✅ ${consentInserts.length} consents created\n`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('─'.repeat(50));
  console.log('🎉 Seed complete!\n');
  console.log('📊 Summary:');
  console.log(`   Users:        ${users.length} (5 admin, 20 recruiters, 75 regular)`);
  console.log(`   Profiles:     ${profiles.length}`);
  console.log(`   Skills:       ${createdSkills.length} skill types assigned to all profiles`);
  console.log(`   Connections:  ${connectionData.length} (~65% accepted, ~20% pending, ~15% rejected)`);
  console.log(`   Posts:        ${posts.length}`);
  console.log(`   Likes:        ${likeData.length}`);
  console.log(`   Comments:     ${commentData.length}`);
  console.log(`   Jobs:         ${jobs.length}`);
  console.log(`   Applications: ${appData.length}`);
  console.log(`   Saved jobs:   ${savedData.length}`);
  console.log(`   Consents:     ${consentInserts.length}`);
  console.log('');
  console.log('🔑 All accounts use password: Test1234!');
  console.log('');
  console.log('Sample accounts:');
  console.log('   admin1@connectin.dev    (admin)');
  console.log('   recruiter1@connectin.dev (recruiter)');
  console.log('   user1@connectin.dev     (user)');
  console.log('   user25@connectin.dev    (user)');
  console.log('   user50@connectin.dev    (user)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
