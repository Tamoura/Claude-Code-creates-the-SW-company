import { PrismaClient, Dimension, AgeBand } from '@prisma/client';

const prisma = new PrismaClient();

interface GoalTemplateSeed {
  dimension: Dimension;
  ageBand: AgeBand;
  title: string;
  description: string;
  titleAr: string | null;
  descriptionAr: string | null;
  category: string;
  sortOrder: number;
}

// --- Academic ---

const academicEarlyYears: GoalTemplateSeed[] = [
  {
    dimension: 'academic', ageBand: 'early_years',
    title: 'Learn to count to 20',
    description: 'Count objects and recite numbers from 1 to 20 independently.',
    titleAr: 'تعلّم العدّ حتى ٢٠',
    descriptionAr: 'عدّ الأشياء وترديد الأرقام من ١ إلى ٢٠ بشكل مستقل.',
    category: 'numeracy', sortOrder: 1,
  },
  {
    dimension: 'academic', ageBand: 'early_years',
    title: 'Recognise all letters of the alphabet',
    description: 'Identify both uppercase and lowercase letters when shown.',
    titleAr: 'التعرّف على جميع حروف الأبجدية',
    descriptionAr: 'تمييز الحروف الكبيرة والصغيرة عند عرضها.',
    category: 'literacy', sortOrder: 2,
  },
  {
    dimension: 'academic', ageBand: 'early_years',
    title: 'Write their own name',
    description: 'Write first name legibly without copying from a model.',
    titleAr: 'كتابة اسمه بنفسه',
    descriptionAr: 'كتابة الاسم الأول بخط واضح دون نسخه من نموذج.',
    category: 'literacy', sortOrder: 3,
  },
  {
    dimension: 'academic', ageBand: 'early_years',
    title: 'Match colours and shapes',
    description: 'Correctly identify and match basic colours and shapes.',
    titleAr: 'مطابقة الألوان والأشكال',
    descriptionAr: 'التعرّف على الألوان والأشكال الأساسية ومطابقتها بشكل صحيح.',
    category: 'cognitive', sortOrder: 4,
  },
  {
    dimension: 'academic', ageBand: 'early_years',
    title: 'Listen to a story without interrupting',
    description: 'Sit through a short story, paying attention to the narrative.',
    titleAr: 'الاستماع إلى قصة دون مقاطعة',
    descriptionAr: 'الجلوس خلال قصة قصيرة والانتباه لأحداثها.',
    category: 'listening', sortOrder: 5,
  },
  {
    dimension: 'academic', ageBand: 'early_years',
    title: 'Sort objects by size or colour',
    description: 'Group objects into categories based on a single attribute.',
    titleAr: 'تصنيف الأشياء حسب الحجم أو اللون',
    descriptionAr: 'تجميع الأشياء في فئات بناءً على صفة واحدة.',
    category: 'cognitive', sortOrder: 6,
  },
];

const academicPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'academic', ageBand: 'primary',
    title: 'Read a chapter book independently',
    description: 'Read age-appropriate chapter books with comprehension.',
    titleAr: 'قراءة كتاب ذي فصول بشكل مستقل',
    descriptionAr: 'قراءة كتب مناسبة للعمر ذات فصول مع الفهم والاستيعاب.',
    category: 'literacy', sortOrder: 1,
  },
  {
    dimension: 'academic', ageBand: 'primary',
    title: 'Master multiplication tables 1-10',
    description: 'Recall multiplication facts up to 10x10 from memory.',
    titleAr: 'إتقان جداول الضرب من ١ إلى ١٠',
    descriptionAr: 'استذكار حقائق الضرب حتى ١٠×١٠ من الذاكرة.',
    category: 'numeracy', sortOrder: 2,
  },
  {
    dimension: 'academic', ageBand: 'primary',
    title: 'Write a short paragraph with correct grammar',
    description: 'Compose 3-5 sentence paragraphs with proper punctuation.',
    titleAr: 'كتابة فقرة قصيرة بقواعد نحوية صحيحة',
    descriptionAr: 'تأليف فقرات من ٣ إلى ٥ جمل مع علامات ترقيم صحيحة.',
    category: 'literacy', sortOrder: 3,
  },
  {
    dimension: 'academic', ageBand: 'primary',
    title: 'Complete homework independently',
    description: 'Finish daily homework without constant adult assistance.',
    titleAr: 'إنجاز الواجبات المدرسية بشكل مستقل',
    descriptionAr: 'إنهاء الواجبات اليومية دون مساعدة مستمرة من الكبار.',
    category: 'study-skills', sortOrder: 4,
  },
  {
    dimension: 'academic', ageBand: 'primary',
    title: 'Tell time on an analogue clock',
    description: 'Read hours and minutes on a traditional clock face.',
    titleAr: 'قراءة الوقت على الساعة التناظرية',
    descriptionAr: 'قراءة الساعات والدقائق على وجه الساعة التقليدية.',
    category: 'numeracy', sortOrder: 5,
  },
  {
    dimension: 'academic', ageBand: 'primary',
    title: 'Use a dictionary to find word meanings',
    description: 'Look up unfamiliar words and understand definitions.',
    titleAr: 'استخدام القاموس للبحث عن معاني الكلمات',
    descriptionAr: 'البحث عن الكلمات غير المألوفة وفهم تعريفاتها.',
    category: 'literacy', sortOrder: 6,
  },
];

const academicUpperPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'academic', ageBand: 'upper_primary',
    title: 'Write a structured essay',
    description: 'Produce an essay with introduction, body, and conclusion.',
    titleAr: 'كتابة مقال منظّم',
    descriptionAr: 'كتابة مقال يتضمن مقدمة وعرضاً وخاتمة.',
    category: 'literacy', sortOrder: 1,
  },
  {
    dimension: 'academic', ageBand: 'upper_primary',
    title: 'Solve multi-step maths problems',
    description: 'Work through problems requiring multiple operations.',
    titleAr: 'حلّ مسائل رياضية متعددة الخطوات',
    descriptionAr: 'العمل على مسائل تتطلب عمليات حسابية متعددة.',
    category: 'numeracy', sortOrder: 2,
  },
  {
    dimension: 'academic', ageBand: 'upper_primary',
    title: 'Create a study schedule',
    description: 'Plan and follow a weekly study timetable independently.',
    titleAr: 'إعداد جدول للمذاكرة',
    descriptionAr: 'تخطيط جدول دراسي أسبوعي والالتزام به بشكل مستقل.',
    category: 'study-skills', sortOrder: 3,
  },
  {
    dimension: 'academic', ageBand: 'upper_primary',
    title: 'Present a topic to the class',
    description: 'Prepare and deliver a short presentation confidently.',
    titleAr: 'تقديم عرض عن موضوع أمام الصف',
    descriptionAr: 'إعداد وتقديم عرض قصير بثقة أمام زملاء الصف.',
    category: 'communication', sortOrder: 4,
  },
  {
    dimension: 'academic', ageBand: 'upper_primary',
    title: 'Research a topic using multiple sources',
    description: 'Gather information from books, websites, and other resources.',
    titleAr: 'البحث عن موضوع باستخدام مصادر متعددة',
    descriptionAr: 'جمع المعلومات من الكتب والمواقع الإلكترونية ومصادر أخرى.',
    category: 'research', sortOrder: 5,
  },
];

const academicSecondary: GoalTemplateSeed[] = [
  {
    dimension: 'academic', ageBand: 'secondary',
    title: 'Maintain consistent study routine',
    description: 'Study for at least 1-2 hours daily with focus and purpose.',
    titleAr: 'الحفاظ على روتين دراسي منتظم',
    descriptionAr: 'المذاكرة لمدة ١-٢ ساعة يومياً بتركيز وهدف واضح.',
    category: 'study-skills', sortOrder: 1,
  },
  {
    dimension: 'academic', ageBand: 'secondary',
    title: 'Develop note-taking skills',
    description: 'Take organised, useful notes during lessons and lectures.',
    titleAr: 'تطوير مهارات تدوين الملاحظات',
    descriptionAr: 'تدوين ملاحظات منظمة ومفيدة أثناء الدروس والمحاضرات.',
    category: 'study-skills', sortOrder: 2,
  },
  {
    dimension: 'academic', ageBand: 'secondary',
    title: 'Prepare for exams independently',
    description: 'Create revision plans and study without constant supervision.',
    titleAr: 'التحضير للامتحانات بشكل مستقل',
    descriptionAr: 'إعداد خطط مراجعة والمذاكرة دون إشراف مستمر.',
    category: 'study-skills', sortOrder: 3,
  },
  {
    dimension: 'academic', ageBand: 'secondary',
    title: 'Write analytical essays',
    description: 'Produce essays that analyse, compare, and evaluate ideas.',
    titleAr: 'كتابة مقالات تحليلية',
    descriptionAr: 'كتابة مقالات تحلّل الأفكار وتقارن بينها وتقيّمها.',
    category: 'literacy', sortOrder: 4,
  },
  {
    dimension: 'academic', ageBand: 'secondary',
    title: 'Manage multiple subject deadlines',
    description: 'Track and meet deadlines across different subjects.',
    titleAr: 'إدارة مواعيد تسليم المواد المتعددة',
    descriptionAr: 'متابعة مواعيد التسليم والالتزام بها عبر مختلف المواد الدراسية.',
    category: 'organisation', sortOrder: 5,
  },
];

// --- Islamic ---

const islamicEarlyYears: GoalTemplateSeed[] = [
  {
    dimension: 'islamic', ageBand: 'early_years',
    title: 'Learn to say Bismillah before eating',
    description: 'Remember to say Bismillah before meals consistently.',
    titleAr: 'تعلّم قول بسم الله قبل الأكل',
    descriptionAr: 'التذكّر الدائم لقول بسم الله قبل تناول الطعام.',
    category: 'daily-practice', sortOrder: 1,
  },
  {
    dimension: 'islamic', ageBand: 'early_years',
    title: 'Memorise Al-Fatiha',
    description: 'Recite Surah Al-Fatiha from memory with correct pronunciation.',
    titleAr: 'حفظ سورة الفاتحة',
    descriptionAr: 'تلاوة سورة الفاتحة غيباً بنطق صحيح.',
    category: 'quran', sortOrder: 2,
  },
  {
    dimension: 'islamic', ageBand: 'early_years',
    title: 'Learn the 5 daily prayers by name',
    description: 'Know the names and approximate times of the 5 daily prayers.',
    titleAr: 'تعلّم أسماء الصلوات الخمس',
    descriptionAr: 'معرفة أسماء الصلوات الخمس وأوقاتها التقريبية.',
    category: 'prayer', sortOrder: 3,
  },
  {
    dimension: 'islamic', ageBand: 'early_years',
    title: 'Know the basic dua for sleeping',
    description: 'Recite the short dua before going to sleep.',
    titleAr: 'معرفة دعاء النوم',
    descriptionAr: 'ترديد الدعاء القصير قبل الخلود إلى النوم.',
    category: 'daily-practice', sortOrder: 4,
  },
  {
    dimension: 'islamic', ageBand: 'early_years',
    title: 'Recognise Arabic letters',
    description: 'Identify the letters of the Arabic alphabet.',
    titleAr: 'التعرّف على الحروف العربية',
    descriptionAr: 'تمييز حروف الأبجدية العربية.',
    category: 'arabic', sortOrder: 5,
  },
  {
    dimension: 'islamic', ageBand: 'early_years',
    title: 'Learn about Prophet Muhammad (PBUH)',
    description: 'Know basic facts about the Prophet through stories.',
    titleAr: 'التعرّف على النبي محمد ﷺ',
    descriptionAr: 'معرفة حقائق أساسية عن النبي ﷺ من خلال القصص.',
    category: 'seerah', sortOrder: 6,
  },
];

const islamicPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'islamic', ageBand: 'primary',
    title: 'Memorise 5 short surahs',
    description: 'Learn Al-Fatiha plus 4 short surahs from Juz Amma.',
    titleAr: 'حفظ ٥ سور قصيرة',
    descriptionAr: 'حفظ سورة الفاتحة و٤ سور قصيرة من جزء عمّ.',
    category: 'quran', sortOrder: 1,
  },
  {
    dimension: 'islamic', ageBand: 'primary',
    title: 'Learn the 5 pillars of Islam',
    description: 'Name and explain each of the 5 pillars of Islam.',
    titleAr: 'تعلّم أركان الإسلام الخمسة',
    descriptionAr: 'ذكر وشرح كل ركن من أركان الإسلام الخمسة.',
    category: 'aqeedah', sortOrder: 2,
  },
  {
    dimension: 'islamic', ageBand: 'primary',
    title: 'Pray at least 2 daily prayers regularly',
    description: 'Establish a consistent habit of praying Fajr and Isha.',
    titleAr: 'أداء صلاتين يومياً بانتظام',
    descriptionAr: 'بناء عادة ثابتة في أداء صلاتي الفجر والعشاء.',
    category: 'prayer', sortOrder: 3,
  },
  {
    dimension: 'islamic', ageBand: 'primary',
    title: 'Read Arabic letters with basic vowels',
    description: 'Read simple Arabic words with fatha, kasra, and damma.',
    titleAr: 'قراءة الحروف العربية بالحركات الأساسية',
    descriptionAr: 'قراءة كلمات عربية بسيطة بالفتحة والكسرة والضمة.',
    category: 'arabic', sortOrder: 4,
  },
  {
    dimension: 'islamic', ageBand: 'primary',
    title: 'Learn 10 daily duas',
    description: 'Memorise duas for eating, travelling, entering the masjid, etc.',
    titleAr: 'حفظ ١٠ أدعية يومية',
    descriptionAr: 'حفظ أدعية الطعام والسفر ودخول المسجد وغيرها.',
    category: 'daily-practice', sortOrder: 5,
  },
  {
    dimension: 'islamic', ageBand: 'primary',
    title: 'Know the stories of 5 prophets',
    description: 'Recall key stories of prophets like Nuh, Ibrahim, Musa, Isa, and Muhammad.',
    titleAr: 'معرفة قصص ٥ من الأنبياء',
    descriptionAr: 'استذكار قصص الأنبياء الرئيسية كنوح وإبراهيم وموسى وعيسى ومحمد عليهم السلام.',
    category: 'seerah', sortOrder: 6,
  },
];

const islamicUpperPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'islamic', ageBand: 'upper_primary',
    title: 'Memorise Juz Amma',
    description: 'Complete memorisation of the 30th Juz of the Quran.',
    titleAr: 'حفظ جزء عمّ',
    descriptionAr: 'إتمام حفظ الجزء الثلاثين من القرآن الكريم.',
    category: 'quran', sortOrder: 1,
  },
  {
    dimension: 'islamic', ageBand: 'upper_primary',
    title: 'Pray all 5 daily prayers',
    description: 'Establish a consistent routine of all 5 daily prayers.',
    titleAr: 'أداء الصلوات الخمس كاملة',
    descriptionAr: 'بناء روتين ثابت لأداء جميع الصلوات الخمس يومياً.',
    category: 'prayer', sortOrder: 2,
  },
  {
    dimension: 'islamic', ageBand: 'upper_primary',
    title: 'Read Quran with basic tajweed',
    description: 'Recite Quran observing basic tajweed rules.',
    titleAr: 'قراءة القرآن بأحكام التجويد الأساسية',
    descriptionAr: 'تلاوة القرآن الكريم مع مراعاة أحكام التجويد الأساسية.',
    category: 'quran', sortOrder: 3,
  },
  {
    dimension: 'islamic', ageBand: 'upper_primary',
    title: 'Fast during Ramadan (partial or full)',
    description: 'Begin fasting days during Ramadan with family support.',
    titleAr: 'صيام رمضان (جزئياً أو كاملاً)',
    descriptionAr: 'البدء بصيام أيام في رمضان بدعم من الأسرة.',
    category: 'worship', sortOrder: 4,
  },
  {
    dimension: 'islamic', ageBand: 'upper_primary',
    title: 'Understand the meaning of prayer',
    description: 'Learn and reflect on what is said during each part of salah.',
    titleAr: 'فهم معاني الصلاة',
    descriptionAr: 'تعلّم والتأمّل في ما يُقال في كل جزء من أجزاء الصلاة.',
    category: 'prayer', sortOrder: 5,
  },
];

const islamicSecondary: GoalTemplateSeed[] = [
  {
    dimension: 'islamic', ageBand: 'secondary',
    title: 'Read and reflect on Quran daily',
    description: 'Establish a daily habit of reading and contemplating Quran.',
    titleAr: 'قراءة القرآن والتدبّر فيه يومياً',
    descriptionAr: 'بناء عادة يومية لقراءة القرآن الكريم والتأمّل في معانيه.',
    category: 'quran', sortOrder: 1,
  },
  {
    dimension: 'islamic', ageBand: 'secondary',
    title: 'Pray all 5 prayers on time',
    description: 'Maintain consistent, timely performance of all daily prayers.',
    titleAr: 'أداء الصلوات الخمس في أوقاتها',
    descriptionAr: 'المحافظة على أداء جميع الصلوات اليومية في أوقاتها بانتظام.',
    category: 'prayer', sortOrder: 2,
  },
  {
    dimension: 'islamic', ageBand: 'secondary',
    title: 'Study a book of hadith',
    description: 'Read and discuss hadiths from Bukhari, Muslim, or Nawawi 40.',
    titleAr: 'دراسة كتاب في الحديث النبوي',
    descriptionAr: 'قراءة ومناقشة أحاديث من البخاري أو مسلم أو الأربعين النووية.',
    category: 'hadith', sortOrder: 3,
  },
  {
    dimension: 'islamic', ageBand: 'secondary',
    title: 'Fast the full month of Ramadan',
    description: 'Complete the full month of fasting as obligatory worship.',
    titleAr: 'صيام شهر رمضان كاملاً',
    descriptionAr: 'إتمام صيام شهر رمضان كاملاً كعبادة مفروضة.',
    category: 'worship', sortOrder: 4,
  },
  {
    dimension: 'islamic', ageBand: 'secondary',
    title: 'Understand Islamic ethics and apply them',
    description: 'Study Islamic moral principles and practise them in daily life.',
    titleAr: 'فهم الأخلاق الإسلامية وتطبيقها',
    descriptionAr: 'دراسة المبادئ الأخلاقية الإسلامية وممارستها في الحياة اليومية.',
    category: 'character', sortOrder: 5,
  },
];

// --- Physical ---

const physicalEarlyYears: GoalTemplateSeed[] = [
  {
    dimension: 'physical', ageBand: 'early_years',
    title: 'Run and jump confidently',
    description: 'Move with coordination, running and jumping during play.',
    titleAr: 'الجري والقفز بثقة',
    descriptionAr: 'التحرّك بتناسق والجري والقفز أثناء اللعب.',
    category: 'gross-motor', sortOrder: 1,
  },
  {
    dimension: 'physical', ageBand: 'early_years',
    title: 'Catch a large ball',
    description: 'Catch a gently thrown ball using both hands.',
    titleAr: 'التقاط كرة كبيرة',
    descriptionAr: 'التقاط كرة مُلقاة بلطف باستخدام اليدين.',
    category: 'coordination', sortOrder: 2,
  },
  {
    dimension: 'physical', ageBand: 'early_years',
    title: 'Use scissors safely',
    description: 'Cut along a straight line with child-safe scissors.',
    titleAr: 'استخدام المقص بأمان',
    descriptionAr: 'القص على خط مستقيم باستخدام مقص آمن للأطفال.',
    category: 'fine-motor', sortOrder: 3,
  },
  {
    dimension: 'physical', ageBand: 'early_years',
    title: 'Balance on one foot for 5 seconds',
    description: 'Stand on one foot with reasonable stability.',
    titleAr: 'التوازن على قدم واحدة لمدة ٥ ثوانٍ',
    descriptionAr: 'الوقوف على قدم واحدة بثبات معقول.',
    category: 'balance', sortOrder: 4,
  },
  {
    dimension: 'physical', ageBand: 'early_years',
    title: 'Dress independently',
    description: 'Put on and take off clothes without assistance.',
    titleAr: 'ارتداء الملابس بشكل مستقل',
    descriptionAr: 'ارتداء الملابس وخلعها دون مساعدة.',
    category: 'self-care', sortOrder: 5,
  },
];

const physicalPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'physical', ageBand: 'primary',
    title: 'Learn to swim',
    description: 'Swim at least 25 metres unaided in deep water.',
    titleAr: 'تعلّم السباحة',
    descriptionAr: 'السباحة لمسافة ٢٥ متراً على الأقل دون مساعدة في مياه عميقة.',
    category: 'sport', sortOrder: 1,
  },
  {
    dimension: 'physical', ageBand: 'primary',
    title: 'Ride a bicycle without stabilisers',
    description: 'Cycle confidently without training wheels.',
    titleAr: 'ركوب الدراجة بدون عجلات إضافية',
    descriptionAr: 'قيادة الدراجة بثقة بدون عجلات التدريب.',
    category: 'gross-motor', sortOrder: 2,
  },
  {
    dimension: 'physical', ageBand: 'primary',
    title: 'Play a team sport regularly',
    description: 'Participate in a team sport like football, basketball, or cricket.',
    titleAr: 'ممارسة رياضة جماعية بانتظام',
    descriptionAr: 'المشاركة في رياضة جماعية مثل كرة القدم أو السلة أو الكريكت.',
    category: 'sport', sortOrder: 3,
  },
  {
    dimension: 'physical', ageBand: 'primary',
    title: 'Develop good handwriting',
    description: 'Write legibly with consistent letter size and spacing.',
    titleAr: 'تحسين الخط اليدوي',
    descriptionAr: 'الكتابة بخط واضح بحجم حروف متناسق ومسافات منتظمة.',
    category: 'fine-motor', sortOrder: 4,
  },
  {
    dimension: 'physical', ageBand: 'primary',
    title: 'Be active for 60 minutes daily',
    description: 'Engage in physical activity for at least an hour each day.',
    titleAr: 'ممارسة النشاط البدني ٦٠ دقيقة يومياً',
    descriptionAr: 'ممارسة نشاط بدني لمدة ساعة على الأقل كل يوم.',
    category: 'fitness', sortOrder: 5,
  },
];

const physicalUpperPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'physical', ageBand: 'upper_primary',
    title: 'Learn a martial art or self-defence',
    description: 'Begin formal training in a martial art discipline.',
    titleAr: 'تعلّم فنون الدفاع عن النفس',
    descriptionAr: 'البدء بتدريب منظّم في أحد فنون القتال أو الدفاع عن النفس.',
    category: 'sport', sortOrder: 1,
  },
  {
    dimension: 'physical', ageBand: 'upper_primary',
    title: 'Maintain good posture',
    description: 'Sit and stand with correct posture during daily activities.',
    titleAr: 'المحافظة على وضعية جسم صحيحة',
    descriptionAr: 'الجلوس والوقوف بوضعية صحيحة خلال الأنشطة اليومية.',
    category: 'health', sortOrder: 2,
  },
  {
    dimension: 'physical', ageBand: 'upper_primary',
    title: 'Understand basic nutrition',
    description: 'Know which foods are healthy and make good choices.',
    titleAr: 'فهم أساسيات التغذية',
    descriptionAr: 'معرفة الأطعمة الصحية واتخاذ خيارات غذائية جيدة.',
    category: 'nutrition', sortOrder: 3,
  },
  {
    dimension: 'physical', ageBand: 'upper_primary',
    title: 'Compete in a sport or athletic event',
    description: 'Participate in a school or community sporting competition.',
    titleAr: 'المشاركة في مسابقة رياضية',
    descriptionAr: 'المشاركة في مسابقة رياضية مدرسية أو مجتمعية.',
    category: 'sport', sortOrder: 4,
  },
  {
    dimension: 'physical', ageBand: 'upper_primary',
    title: 'Maintain a consistent sleep schedule',
    description: 'Go to bed and wake up at regular times on school days.',
    titleAr: 'الالتزام بجدول نوم منتظم',
    descriptionAr: 'النوم والاستيقاظ في أوقات محددة خلال أيام الدراسة.',
    category: 'health', sortOrder: 5,
  },
];

const physicalSecondary: GoalTemplateSeed[] = [
  {
    dimension: 'physical', ageBand: 'secondary',
    title: 'Establish a regular exercise routine',
    description: 'Exercise at least 3-4 times per week with intentional workouts.',
    titleAr: 'بناء روتين رياضي منتظم',
    descriptionAr: 'ممارسة التمارين الرياضية ٣-٤ مرات أسبوعياً بشكل مقصود ومنظّم.',
    category: 'fitness', sortOrder: 1,
  },
  {
    dimension: 'physical', ageBand: 'secondary',
    title: 'Learn proper nutrition basics',
    description: 'Understand macronutrients, hydration, and balanced meal planning.',
    titleAr: 'تعلّم أساسيات التغذية السليمة',
    descriptionAr: 'فهم العناصر الغذائية الكبرى والترطيب وتخطيط الوجبات المتوازنة.',
    category: 'nutrition', sortOrder: 2,
  },
  {
    dimension: 'physical', ageBand: 'secondary',
    title: 'Achieve a personal fitness goal',
    description: 'Set and reach a measurable fitness target (e.g. run 5k).',
    titleAr: 'تحقيق هدف لياقة بدنية شخصي',
    descriptionAr: 'تحديد هدف لياقة قابل للقياس وتحقيقه (مثل الجري ٥ كيلومترات).',
    category: 'fitness', sortOrder: 3,
  },
  {
    dimension: 'physical', ageBand: 'secondary',
    title: 'Practice good hygiene habits',
    description: 'Maintain consistent personal hygiene without reminders.',
    titleAr: 'ممارسة عادات النظافة الشخصية',
    descriptionAr: 'المحافظة على النظافة الشخصية بشكل مستمر دون تذكير.',
    category: 'self-care', sortOrder: 4,
  },
  {
    dimension: 'physical', ageBand: 'secondary',
    title: 'Manage screen time responsibly',
    description: 'Limit recreational screen time and balance with physical activity.',
    titleAr: 'إدارة وقت الشاشة بمسؤولية',
    descriptionAr: 'تقليل وقت الشاشة الترفيهي وموازنته مع النشاط البدني.',
    category: 'health', sortOrder: 5,
  },
];

// --- Social-Emotional ---

const socialEarlyYears: GoalTemplateSeed[] = [
  {
    dimension: 'social_emotional', ageBand: 'early_years',
    title: 'Share toys with peers',
    description: 'Take turns and share toys during playtime without prompting.',
    titleAr: 'مشاركة الألعاب مع الأقران',
    descriptionAr: 'التناوب ومشاركة الألعاب أثناء وقت اللعب دون تذكير.',
    category: 'social', sortOrder: 1,
  },
  {
    dimension: 'social_emotional', ageBand: 'early_years',
    title: 'Express feelings with words',
    description: 'Use words to communicate emotions instead of actions.',
    titleAr: 'التعبير عن المشاعر بالكلمات',
    descriptionAr: 'استخدام الكلمات للتعبير عن المشاعر بدلاً من الأفعال.',
    category: 'emotional', sortOrder: 2,
  },
  {
    dimension: 'social_emotional', ageBand: 'early_years',
    title: 'Say please and thank you',
    description: 'Use polite words consistently in daily interactions.',
    titleAr: 'قول من فضلك وشكراً',
    descriptionAr: 'استخدام كلمات مهذبة باستمرار في التعاملات اليومية.',
    category: 'manners', sortOrder: 3,
  },
  {
    dimension: 'social_emotional', ageBand: 'early_years',
    title: 'Separate from parent without distress',
    description: 'Stay comfortably at nursery or with caregivers.',
    titleAr: 'الانفصال عن الوالدين دون انزعاج',
    descriptionAr: 'البقاء بارتياح في الحضانة أو مع مقدّمي الرعاية.',
    category: 'emotional', sortOrder: 4,
  },
  {
    dimension: 'social_emotional', ageBand: 'early_years',
    title: 'Play cooperatively with others',
    description: 'Engage in group play with basic cooperation skills.',
    titleAr: 'اللعب التعاوني مع الآخرين',
    descriptionAr: 'المشاركة في اللعب الجماعي بمهارات تعاون أساسية.',
    category: 'social', sortOrder: 5,
  },
  {
    dimension: 'social_emotional', ageBand: 'early_years',
    title: 'Follow simple rules',
    description: 'Understand and follow basic rules at home and school.',
    titleAr: 'اتباع القواعد البسيطة',
    descriptionAr: 'فهم واتباع القواعد الأساسية في المنزل والمدرسة.',
    category: 'self-regulation', sortOrder: 6,
  },
];

const socialPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'social_emotional', ageBand: 'primary',
    title: 'Make and keep a friend',
    description: 'Develop and maintain at least one meaningful friendship.',
    titleAr: 'تكوين صداقة والحفاظ عليها',
    descriptionAr: 'بناء صداقة هادفة واحدة على الأقل والحفاظ عليها.',
    category: 'social', sortOrder: 1,
  },
  {
    dimension: 'social_emotional', ageBand: 'primary',
    title: 'Manage anger without hitting',
    description: 'Use calming strategies when feeling angry or frustrated.',
    titleAr: 'التحكّم في الغضب دون ضرب',
    descriptionAr: 'استخدام استراتيجيات التهدئة عند الشعور بالغضب أو الإحباط.',
    category: 'self-regulation', sortOrder: 2,
  },
  {
    dimension: 'social_emotional', ageBand: 'primary',
    title: 'Show empathy to others',
    description: 'Recognise when others are upset and offer comfort.',
    titleAr: 'إظهار التعاطف مع الآخرين',
    descriptionAr: 'ملاحظة حزن الآخرين وتقديم المواساة لهم.',
    category: 'emotional', sortOrder: 3,
  },
  {
    dimension: 'social_emotional', ageBand: 'primary',
    title: 'Resolve conflicts with words',
    description: 'Talk through disagreements rather than reacting physically.',
    titleAr: 'حلّ الخلافات بالكلام',
    descriptionAr: 'مناقشة الخلافات بالحوار بدلاً من ردود الفعل الجسدية.',
    category: 'social', sortOrder: 4,
  },
  {
    dimension: 'social_emotional', ageBand: 'primary',
    title: 'Accept losing gracefully',
    description: 'Handle disappointment in games and competitions positively.',
    titleAr: 'تقبّل الخسارة بروح رياضية',
    descriptionAr: 'التعامل مع خيبة الأمل في الألعاب والمسابقات بإيجابية.',
    category: 'resilience', sortOrder: 5,
  },
];

const socialUpperPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'social_emotional', ageBand: 'upper_primary',
    title: 'Navigate peer pressure',
    description: 'Recognise and resist negative peer pressure situations.',
    titleAr: 'التعامل مع ضغط الأقران',
    descriptionAr: 'التعرّف على ضغط الأقران السلبي ومقاومته.',
    category: 'social', sortOrder: 1,
  },
  {
    dimension: 'social_emotional', ageBand: 'upper_primary',
    title: 'Express opinions respectfully',
    description: 'Share views confidently while respecting others opinions.',
    titleAr: 'التعبير عن الرأي باحترام',
    descriptionAr: 'مشاركة الآراء بثقة مع احترام آراء الآخرين.',
    category: 'communication', sortOrder: 2,
  },
  {
    dimension: 'social_emotional', ageBand: 'upper_primary',
    title: 'Develop a growth mindset',
    description: 'View challenges as opportunities to learn and improve.',
    titleAr: 'تطوير عقلية النمو',
    descriptionAr: 'النظر إلى التحديات باعتبارها فرصاً للتعلّم والتحسّن.',
    category: 'resilience', sortOrder: 3,
  },
  {
    dimension: 'social_emotional', ageBand: 'upper_primary',
    title: 'Manage disappointment constructively',
    description: 'Process setbacks without prolonged negativity.',
    titleAr: 'التعامل مع خيبة الأمل بشكل بنّاء',
    descriptionAr: 'معالجة النكسات دون الاستسلام للسلبية المطوّلة.',
    category: 'emotional', sortOrder: 4,
  },
  {
    dimension: 'social_emotional', ageBand: 'upper_primary',
    title: 'Show kindness to classmates',
    description: 'Actively include and support peers in daily interactions.',
    titleAr: 'إظهار اللطف مع زملاء الصف',
    descriptionAr: 'إشراك الزملاء ودعمهم بفاعلية في التعاملات اليومية.',
    category: 'social', sortOrder: 5,
  },
];

const socialSecondary: GoalTemplateSeed[] = [
  {
    dimension: 'social_emotional', ageBand: 'secondary',
    title: 'Build healthy relationships',
    description: 'Form and maintain positive friendships based on mutual respect.',
    titleAr: 'بناء علاقات صحية',
    descriptionAr: 'تكوين صداقات إيجابية والحفاظ عليها على أساس الاحترام المتبادل.',
    category: 'social', sortOrder: 1,
  },
  {
    dimension: 'social_emotional', ageBand: 'secondary',
    title: 'Manage stress effectively',
    description: 'Use healthy coping strategies when feeling overwhelmed.',
    titleAr: 'إدارة الضغوط بفعالية',
    descriptionAr: 'استخدام استراتيجيات تأقلم صحية عند الشعور بالإرهاق.',
    category: 'emotional', sortOrder: 2,
  },
  {
    dimension: 'social_emotional', ageBand: 'secondary',
    title: 'Communicate assertively',
    description: 'Express needs and boundaries clearly and respectfully.',
    titleAr: 'التواصل بحزم وثقة',
    descriptionAr: 'التعبير عن الاحتياجات والحدود بوضوح واحترام.',
    category: 'communication', sortOrder: 3,
  },
  {
    dimension: 'social_emotional', ageBand: 'secondary',
    title: 'Develop self-awareness',
    description: 'Understand personal strengths, weaknesses, and triggers.',
    titleAr: 'تطوير الوعي الذاتي',
    descriptionAr: 'فهم نقاط القوة والضعف الشخصية والمحفّزات العاطفية.',
    category: 'emotional', sortOrder: 4,
  },
  {
    dimension: 'social_emotional', ageBand: 'secondary',
    title: 'Show leadership in group settings',
    description: 'Take initiative and guide others in collaborative situations.',
    titleAr: 'إظهار القيادة في البيئات الجماعية',
    descriptionAr: 'أخذ زمام المبادرة وتوجيه الآخرين في المواقف التعاونية.',
    category: 'leadership', sortOrder: 5,
  },
];

// --- Behavioural ---

const behaviouralEarlyYears: GoalTemplateSeed[] = [
  {
    dimension: 'behavioural', ageBand: 'early_years',
    title: 'Follow a daily routine',
    description: 'Complete morning and bedtime routines with minimal prompting.',
    titleAr: 'اتباع روتين يومي',
    descriptionAr: 'إتمام روتين الصباح والنوم بأقل قدر من التذكير.',
    category: 'routine', sortOrder: 1,
  },
  {
    dimension: 'behavioural', ageBand: 'early_years',
    title: 'Tidy up after play',
    description: 'Put toys and materials away after finishing an activity.',
    titleAr: 'الترتيب بعد اللعب',
    descriptionAr: 'إعادة الألعاب والأدوات إلى أماكنها بعد انتهاء النشاط.',
    category: 'responsibility', sortOrder: 2,
  },
  {
    dimension: 'behavioural', ageBand: 'early_years',
    title: 'Wait their turn',
    description: 'Wait patiently when taking turns in games and activities.',
    titleAr: 'انتظار الدور',
    descriptionAr: 'الانتظار بصبر عند التناوب في الألعاب والأنشطة.',
    category: 'self-control', sortOrder: 3,
  },
  {
    dimension: 'behavioural', ageBand: 'early_years',
    title: 'Listen when spoken to',
    description: 'Make eye contact and listen when an adult is speaking.',
    titleAr: 'الإنصات عند التحدّث إليه',
    descriptionAr: 'التواصل البصري والاستماع عندما يتحدث شخص بالغ.',
    category: 'respect', sortOrder: 4,
  },
  {
    dimension: 'behavioural', ageBand: 'early_years',
    title: 'Use an indoor voice',
    description: 'Adjust volume appropriately for indoor settings.',
    titleAr: 'استخدام صوت هادئ في الداخل',
    descriptionAr: 'ضبط مستوى الصوت بشكل مناسب في الأماكن المغلقة.',
    category: 'self-control', sortOrder: 5,
  },
];

const behaviouralPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'behavioural', ageBand: 'primary',
    title: 'Complete chores without reminders',
    description: 'Do assigned household tasks independently and consistently.',
    titleAr: 'إنجاز الأعمال المنزلية دون تذكير',
    descriptionAr: 'القيام بالمهام المنزلية المحددة بشكل مستقل ومستمر.',
    category: 'responsibility', sortOrder: 1,
  },
  {
    dimension: 'behavioural', ageBand: 'primary',
    title: 'Be ready for school on time',
    description: 'Prepare bag, uniform, and be ready to leave on schedule.',
    titleAr: 'الاستعداد للمدرسة في الوقت المحدد',
    descriptionAr: 'تجهيز الحقيبة والزي المدرسي والاستعداد للخروج في الموعد.',
    category: 'routine', sortOrder: 2,
  },
  {
    dimension: 'behavioural', ageBand: 'primary',
    title: 'Follow classroom rules',
    description: 'Consistently follow school and classroom expectations.',
    titleAr: 'الالتزام بقواعد الصف',
    descriptionAr: 'اتباع قواعد المدرسة والصف بشكل مستمر.',
    category: 'respect', sortOrder: 3,
  },
  {
    dimension: 'behavioural', ageBand: 'primary',
    title: 'Limit screen time to agreed hours',
    description: 'Respect agreed screen time limits without arguments.',
    titleAr: 'الالتزام بوقت الشاشة المتفق عليه',
    descriptionAr: 'احترام حدود وقت الشاشة المتفق عليها دون جدال.',
    category: 'self-control', sortOrder: 4,
  },
  {
    dimension: 'behavioural', ageBand: 'primary',
    title: 'Apologise when wrong',
    description: 'Recognise mistakes and offer sincere apologies.',
    titleAr: 'الاعتذار عند الخطأ',
    descriptionAr: 'الاعتراف بالأخطاء وتقديم اعتذار صادق.',
    category: 'accountability', sortOrder: 5,
  },
];

const behaviouralUpperPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'behavioural', ageBand: 'upper_primary',
    title: 'Manage time independently',
    description: 'Plan and use time wisely across homework, chores, and leisure.',
    titleAr: 'إدارة الوقت بشكل مستقل',
    descriptionAr: 'تخطيط الوقت واستغلاله بحكمة بين الواجبات والأعمال المنزلية والترفيه.',
    category: 'time-management', sortOrder: 1,
  },
  {
    dimension: 'behavioural', ageBand: 'upper_primary',
    title: 'Take responsibility for actions',
    description: 'Own up to mistakes and accept consequences maturely.',
    titleAr: 'تحمّل مسؤولية الأفعال',
    descriptionAr: 'الاعتراف بالأخطاء وقبول العواقب بنضج.',
    category: 'accountability', sortOrder: 2,
  },
  {
    dimension: 'behavioural', ageBand: 'upper_primary',
    title: 'Show respect to elders and teachers',
    description: 'Speak and behave respectfully with adults consistently.',
    titleAr: 'إظهار الاحترام للكبار والمعلمين',
    descriptionAr: 'التحدث والتصرف باحترام مع الكبار بشكل مستمر.',
    category: 'respect', sortOrder: 3,
  },
  {
    dimension: 'behavioural', ageBand: 'upper_primary',
    title: 'Keep personal space organised',
    description: 'Maintain a tidy room and organised school materials.',
    titleAr: 'الحفاظ على ترتيب المساحة الشخصية',
    descriptionAr: 'الحفاظ على غرفة مرتبة وأدوات مدرسية منظّمة.',
    category: 'responsibility', sortOrder: 4,
  },
  {
    dimension: 'behavioural', ageBand: 'upper_primary',
    title: 'Practise honesty consistently',
    description: 'Tell the truth even when it is difficult.',
    titleAr: 'ممارسة الصدق باستمرار',
    descriptionAr: 'قول الحقيقة حتى عندما يكون ذلك صعباً.',
    category: 'integrity', sortOrder: 5,
  },
];

const behaviouralSecondary: GoalTemplateSeed[] = [
  {
    dimension: 'behavioural', ageBand: 'secondary',
    title: 'Demonstrate self-discipline',
    description: 'Make responsible choices about priorities and commitments.',
    titleAr: 'إظهار الانضباط الذاتي',
    descriptionAr: 'اتخاذ خيارات مسؤولة بشأن الأولويات والالتزامات.',
    category: 'self-control', sortOrder: 1,
  },
  {
    dimension: 'behavioural', ageBand: 'secondary',
    title: 'Manage finances responsibly',
    description: 'Budget pocket money and make thoughtful spending decisions.',
    titleAr: 'إدارة المال بمسؤولية',
    descriptionAr: 'وضع ميزانية للمصروف واتخاذ قرارات إنفاق مدروسة.',
    category: 'financial', sortOrder: 2,
  },
  {
    dimension: 'behavioural', ageBand: 'secondary',
    title: 'Be accountable for commitments',
    description: 'Follow through on promises and obligations reliably.',
    titleAr: 'الالتزام بالوعود والعهود',
    descriptionAr: 'الوفاء بالوعود والالتزامات بشكل موثوق.',
    category: 'accountability', sortOrder: 3,
  },
  {
    dimension: 'behavioural', ageBand: 'secondary',
    title: 'Use technology responsibly',
    description: 'Use devices and social media wisely and safely.',
    titleAr: 'استخدام التكنولوجيا بمسؤولية',
    descriptionAr: 'استخدام الأجهزة ووسائل التواصل الاجتماعي بحكمة وأمان.',
    category: 'digital-citizenship', sortOrder: 4,
  },
  {
    dimension: 'behavioural', ageBand: 'secondary',
    title: 'Help with household responsibilities',
    description: 'Contribute meaningfully to running the household.',
    titleAr: 'المساعدة في مسؤوليات المنزل',
    descriptionAr: 'المساهمة بفاعلية في إدارة شؤون المنزل.',
    category: 'responsibility', sortOrder: 5,
  },
];

// --- Aspirational ---

const aspirationalEarlyYears: GoalTemplateSeed[] = [
  {
    dimension: 'aspirational', ageBand: 'early_years',
    title: 'Talk about what they want to be',
    description: 'Express interests and dream jobs during conversation.',
    titleAr: 'التحدّث عمّا يريد أن يصبح',
    descriptionAr: 'التعبير عن الاهتمامات ومهن الأحلام أثناء الحوار.',
    category: 'identity', sortOrder: 1,
  },
  {
    dimension: 'aspirational', ageBand: 'early_years',
    title: 'Try new activities bravely',
    description: 'Be willing to attempt new experiences without excessive fear.',
    titleAr: 'تجربة أنشطة جديدة بشجاعة',
    descriptionAr: 'الاستعداد لخوض تجارب جديدة دون خوف مفرط.',
    category: 'courage', sortOrder: 2,
  },
  {
    dimension: 'aspirational', ageBand: 'early_years',
    title: 'Show curiosity and ask questions',
    description: 'Ask why and how questions about the world around them.',
    titleAr: 'إظهار الفضول وطرح الأسئلة',
    descriptionAr: 'طرح أسئلة لماذا وكيف حول العالم من حوله.',
    category: 'curiosity', sortOrder: 3,
  },
  {
    dimension: 'aspirational', ageBand: 'early_years',
    title: 'Complete a simple project',
    description: 'Finish an art project, puzzle, or construction to completion.',
    titleAr: 'إتمام مشروع بسيط',
    descriptionAr: 'إنهاء مشروع فني أو أحجية أو بناء حتى اكتماله.',
    category: 'perseverance', sortOrder: 4,
  },
  {
    dimension: 'aspirational', ageBand: 'early_years',
    title: 'Help someone without being asked',
    description: 'Offer help to family or friends spontaneously.',
    titleAr: 'مساعدة شخص دون أن يُطلب منه',
    descriptionAr: 'تقديم المساعدة للعائلة أو الأصدقاء بشكل تلقائي.',
    category: 'service', sortOrder: 5,
  },
];

const aspirationalPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'aspirational', ageBand: 'primary',
    title: 'Set a personal goal and achieve it',
    description: 'Choose a meaningful goal and work towards completing it.',
    titleAr: 'تحديد هدف شخصي وتحقيقه',
    descriptionAr: 'اختيار هدف ذي معنى والعمل على تحقيقه.',
    category: 'goal-setting', sortOrder: 1,
  },
  {
    dimension: 'aspirational', ageBand: 'primary',
    title: 'Explore a new hobby or interest',
    description: 'Try a new activity and dedicate time to developing it.',
    titleAr: 'استكشاف هواية أو اهتمام جديد',
    descriptionAr: 'تجربة نشاط جديد وتخصيص وقت لتطويره.',
    category: 'exploration', sortOrder: 2,
  },
  {
    dimension: 'aspirational', ageBand: 'primary',
    title: 'Read about inspiring people',
    description: 'Learn about role models from diverse backgrounds.',
    titleAr: 'القراءة عن شخصيات ملهمة',
    descriptionAr: 'التعرّف على قدوات من خلفيات متنوعة.',
    category: 'inspiration', sortOrder: 3,
  },
  {
    dimension: 'aspirational', ageBand: 'primary',
    title: 'Participate in a community event',
    description: 'Join a charity event, fundraiser, or community activity.',
    titleAr: 'المشاركة في فعالية مجتمعية',
    descriptionAr: 'الانضمام إلى فعالية خيرية أو حملة تبرع أو نشاط مجتمعي.',
    category: 'service', sortOrder: 4,
  },
  {
    dimension: 'aspirational', ageBand: 'primary',
    title: 'Learn a new skill outside school',
    description: 'Develop a skill such as cooking, coding, or gardening.',
    titleAr: 'تعلّم مهارة جديدة خارج المدرسة',
    descriptionAr: 'تطوير مهارة مثل الطهي أو البرمجة أو البستنة.',
    category: 'skill-building', sortOrder: 5,
  },
];

const aspirationalUpperPrimary: GoalTemplateSeed[] = [
  {
    dimension: 'aspirational', ageBand: 'upper_primary',
    title: 'Identify personal strengths',
    description: 'Recognise and articulate what they are good at.',
    titleAr: 'التعرّف على نقاط القوة الشخصية',
    descriptionAr: 'إدراك ما يجيده والتعبير عنه بوضوح.',
    category: 'self-awareness', sortOrder: 1,
  },
  {
    dimension: 'aspirational', ageBand: 'upper_primary',
    title: 'Research a career of interest',
    description: 'Learn about a profession they find interesting.',
    titleAr: 'البحث عن مهنة تثير الاهتمام',
    descriptionAr: 'التعرّف على مهنة يجدها مثيرة للاهتمام.',
    category: 'career', sortOrder: 2,
  },
  {
    dimension: 'aspirational', ageBand: 'upper_primary',
    title: 'Start a small project or business',
    description: 'Launch a simple entrepreneurial or creative project.',
    titleAr: 'بدء مشروع صغير',
    descriptionAr: 'إطلاق مشروع ريادي أو إبداعي بسيط.',
    category: 'entrepreneurship', sortOrder: 3,
  },
  {
    dimension: 'aspirational', ageBand: 'upper_primary',
    title: 'Volunteer regularly',
    description: 'Commit to regular volunteering in the community.',
    titleAr: 'التطوع بانتظام',
    descriptionAr: 'الالتزام بالعمل التطوعي المنتظم في المجتمع.',
    category: 'service', sortOrder: 4,
  },
  {
    dimension: 'aspirational', ageBand: 'upper_primary',
    title: 'Keep a journal of aspirations',
    description: 'Write regularly about goals, dreams, and progress.',
    titleAr: 'الاحتفاظ بدفتر للطموحات',
    descriptionAr: 'الكتابة بانتظام عن الأهداف والأحلام والتقدّم المحرز.',
    category: 'reflection', sortOrder: 5,
  },
];

const aspirationalSecondary: GoalTemplateSeed[] = [
  {
    dimension: 'aspirational', ageBand: 'secondary',
    title: 'Create a vision for their future',
    description: 'Develop a clear picture of who they want to become.',
    titleAr: 'رسم رؤية للمستقبل',
    descriptionAr: 'بناء صورة واضحة عمّن يريد أن يصبح.',
    category: 'vision', sortOrder: 1,
  },
  {
    dimension: 'aspirational', ageBand: 'secondary',
    title: 'Pursue a passion project',
    description: 'Dedicate significant time to a meaningful personal project.',
    titleAr: 'متابعة مشروع شغف شخصي',
    descriptionAr: 'تخصيص وقت كبير لمشروع شخصي ذي معنى.',
    category: 'passion', sortOrder: 2,
  },
  {
    dimension: 'aspirational', ageBand: 'secondary',
    title: 'Seek mentorship',
    description: 'Find and build a relationship with a mentor in an area of interest.',
    titleAr: 'البحث عن مرشد',
    descriptionAr: 'إيجاد مرشد وبناء علاقة معه في مجال يثير الاهتمام.',
    category: 'networking', sortOrder: 3,
  },
  {
    dimension: 'aspirational', ageBand: 'secondary',
    title: 'Set academic and career goals',
    description: 'Define specific goals for education and future career path.',
    titleAr: 'تحديد أهداف أكاديمية ومهنية',
    descriptionAr: 'وضع أهداف محددة للتعليم والمسار المهني المستقبلي.',
    category: 'goal-setting', sortOrder: 4,
  },
  {
    dimension: 'aspirational', ageBand: 'secondary',
    title: 'Lead a community initiative',
    description: 'Organise and lead a project that benefits others.',
    titleAr: 'قيادة مبادرة مجتمعية',
    descriptionAr: 'تنظيم وقيادة مشروع يعود بالنفع على الآخرين.',
    category: 'leadership', sortOrder: 5,
  },
];

const allTemplates: GoalTemplateSeed[] = [
  ...academicEarlyYears,
  ...academicPrimary,
  ...academicUpperPrimary,
  ...academicSecondary,
  ...islamicEarlyYears,
  ...islamicPrimary,
  ...islamicUpperPrimary,
  ...islamicSecondary,
  ...physicalEarlyYears,
  ...physicalPrimary,
  ...physicalUpperPrimary,
  ...physicalSecondary,
  ...socialEarlyYears,
  ...socialPrimary,
  ...socialUpperPrimary,
  ...socialSecondary,
  ...behaviouralEarlyYears,
  ...behaviouralPrimary,
  ...behaviouralUpperPrimary,
  ...behaviouralSecondary,
  ...aspirationalEarlyYears,
  ...aspirationalPrimary,
  ...aspirationalUpperPrimary,
  ...aspirationalSecondary,
];

async function seedGoalTemplates() {
  console.log(`Seeding ${allTemplates.length} goal templates...`);

  for (const t of allTemplates) {
    await prisma.goalTemplate.upsert({
      where: {
        dimension_ageBand_sortOrder: {
          dimension: t.dimension,
          ageBand: t.ageBand,
          sortOrder: t.sortOrder,
        },
      },
      create: t,
      update: {
        title: t.title,
        description: t.description,
        titleAr: t.titleAr,
        descriptionAr: t.descriptionAr,
        category: t.category,
      },
    });
  }

  console.log('Goal templates seeded successfully.');
}

seedGoalTemplates()
  .catch((e) => {
    console.error('Error seeding goal templates:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
