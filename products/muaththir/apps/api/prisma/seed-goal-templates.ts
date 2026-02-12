import { PrismaClient, Dimension, AgeBand } from '@prisma/client';

const prisma = new PrismaClient();

interface GoalTemplateSeed {
  dimension: Dimension;
  ageBand: AgeBand;
  title: string;
  description: string;
  category: string;
  sortOrder: number;
}

// --- Academic ---

const academicEarlyYears: GoalTemplateSeed[] = [
  { dimension: 'academic', ageBand: 'early_years', title: 'Learn to count to 20', description: 'Count objects and recite numbers from 1 to 20 independently.', category: 'numeracy', sortOrder: 1 },
  { dimension: 'academic', ageBand: 'early_years', title: 'Recognise all letters of the alphabet', description: 'Identify both uppercase and lowercase letters when shown.', category: 'literacy', sortOrder: 2 },
  { dimension: 'academic', ageBand: 'early_years', title: 'Write their own name', description: 'Write first name legibly without copying from a model.', category: 'literacy', sortOrder: 3 },
  { dimension: 'academic', ageBand: 'early_years', title: 'Match colours and shapes', description: 'Correctly identify and match basic colours and shapes.', category: 'cognitive', sortOrder: 4 },
  { dimension: 'academic', ageBand: 'early_years', title: 'Listen to a story without interrupting', description: 'Sit through a short story, paying attention to the narrative.', category: 'listening', sortOrder: 5 },
  { dimension: 'academic', ageBand: 'early_years', title: 'Sort objects by size or colour', description: 'Group objects into categories based on a single attribute.', category: 'cognitive', sortOrder: 6 },
];

const academicPrimary: GoalTemplateSeed[] = [
  { dimension: 'academic', ageBand: 'primary', title: 'Read a chapter book independently', description: 'Read age-appropriate chapter books with comprehension.', category: 'literacy', sortOrder: 1 },
  { dimension: 'academic', ageBand: 'primary', title: 'Master multiplication tables 1-10', description: 'Recall multiplication facts up to 10x10 from memory.', category: 'numeracy', sortOrder: 2 },
  { dimension: 'academic', ageBand: 'primary', title: 'Write a short paragraph with correct grammar', description: 'Compose 3-5 sentence paragraphs with proper punctuation.', category: 'literacy', sortOrder: 3 },
  { dimension: 'academic', ageBand: 'primary', title: 'Complete homework independently', description: 'Finish daily homework without constant adult assistance.', category: 'study-skills', sortOrder: 4 },
  { dimension: 'academic', ageBand: 'primary', title: 'Tell time on an analogue clock', description: 'Read hours and minutes on a traditional clock face.', category: 'numeracy', sortOrder: 5 },
  { dimension: 'academic', ageBand: 'primary', title: 'Use a dictionary to find word meanings', description: 'Look up unfamiliar words and understand definitions.', category: 'literacy', sortOrder: 6 },
];

const academicUpperPrimary: GoalTemplateSeed[] = [
  { dimension: 'academic', ageBand: 'upper_primary', title: 'Write a structured essay', description: 'Produce an essay with introduction, body, and conclusion.', category: 'literacy', sortOrder: 1 },
  { dimension: 'academic', ageBand: 'upper_primary', title: 'Solve multi-step maths problems', description: 'Work through problems requiring multiple operations.', category: 'numeracy', sortOrder: 2 },
  { dimension: 'academic', ageBand: 'upper_primary', title: 'Create a study schedule', description: 'Plan and follow a weekly study timetable independently.', category: 'study-skills', sortOrder: 3 },
  { dimension: 'academic', ageBand: 'upper_primary', title: 'Present a topic to the class', description: 'Prepare and deliver a short presentation confidently.', category: 'communication', sortOrder: 4 },
  { dimension: 'academic', ageBand: 'upper_primary', title: 'Research a topic using multiple sources', description: 'Gather information from books, websites, and other resources.', category: 'research', sortOrder: 5 },
];

const academicSecondary: GoalTemplateSeed[] = [
  { dimension: 'academic', ageBand: 'secondary', title: 'Maintain consistent study routine', description: 'Study for at least 1-2 hours daily with focus and purpose.', category: 'study-skills', sortOrder: 1 },
  { dimension: 'academic', ageBand: 'secondary', title: 'Develop note-taking skills', description: 'Take organised, useful notes during lessons and lectures.', category: 'study-skills', sortOrder: 2 },
  { dimension: 'academic', ageBand: 'secondary', title: 'Prepare for exams independently', description: 'Create revision plans and study without constant supervision.', category: 'study-skills', sortOrder: 3 },
  { dimension: 'academic', ageBand: 'secondary', title: 'Write analytical essays', description: 'Produce essays that analyse, compare, and evaluate ideas.', category: 'literacy', sortOrder: 4 },
  { dimension: 'academic', ageBand: 'secondary', title: 'Manage multiple subject deadlines', description: 'Track and meet deadlines across different subjects.', category: 'organisation', sortOrder: 5 },
];

// --- Islamic ---

const islamicEarlyYears: GoalTemplateSeed[] = [
  { dimension: 'islamic', ageBand: 'early_years', title: 'Learn to say Bismillah before eating', description: 'Remember to say Bismillah before meals consistently.', category: 'daily-practice', sortOrder: 1 },
  { dimension: 'islamic', ageBand: 'early_years', title: 'Memorise Al-Fatiha', description: 'Recite Surah Al-Fatiha from memory with correct pronunciation.', category: 'quran', sortOrder: 2 },
  { dimension: 'islamic', ageBand: 'early_years', title: 'Learn the 5 daily prayers by name', description: 'Know the names and approximate times of the 5 daily prayers.', category: 'prayer', sortOrder: 3 },
  { dimension: 'islamic', ageBand: 'early_years', title: 'Know the basic dua for sleeping', description: 'Recite the short dua before going to sleep.', category: 'daily-practice', sortOrder: 4 },
  { dimension: 'islamic', ageBand: 'early_years', title: 'Recognise Arabic letters', description: 'Identify the letters of the Arabic alphabet.', category: 'arabic', sortOrder: 5 },
  { dimension: 'islamic', ageBand: 'early_years', title: 'Learn about Prophet Muhammad (PBUH)', description: 'Know basic facts about the Prophet through stories.', category: 'seerah', sortOrder: 6 },
];

const islamicPrimary: GoalTemplateSeed[] = [
  { dimension: 'islamic', ageBand: 'primary', title: 'Memorise 5 short surahs', description: 'Learn Al-Fatiha plus 4 short surahs from Juz Amma.', category: 'quran', sortOrder: 1 },
  { dimension: 'islamic', ageBand: 'primary', title: 'Learn the 5 pillars of Islam', description: 'Name and explain each of the 5 pillars of Islam.', category: 'aqeedah', sortOrder: 2 },
  { dimension: 'islamic', ageBand: 'primary', title: 'Pray at least 2 daily prayers regularly', description: 'Establish a consistent habit of praying Fajr and Isha.', category: 'prayer', sortOrder: 3 },
  { dimension: 'islamic', ageBand: 'primary', title: 'Read Arabic letters with basic vowels', description: 'Read simple Arabic words with fatha, kasra, and damma.', category: 'arabic', sortOrder: 4 },
  { dimension: 'islamic', ageBand: 'primary', title: 'Learn 10 daily duas', description: 'Memorise duas for eating, travelling, entering the masjid, etc.', category: 'daily-practice', sortOrder: 5 },
  { dimension: 'islamic', ageBand: 'primary', title: 'Know the stories of 5 prophets', description: 'Recall key stories of prophets like Nuh, Ibrahim, Musa, Isa, and Muhammad.', category: 'seerah', sortOrder: 6 },
];

const islamicUpperPrimary: GoalTemplateSeed[] = [
  { dimension: 'islamic', ageBand: 'upper_primary', title: 'Memorise Juz Amma', description: 'Complete memorisation of the 30th Juz of the Quran.', category: 'quran', sortOrder: 1 },
  { dimension: 'islamic', ageBand: 'upper_primary', title: 'Pray all 5 daily prayers', description: 'Establish a consistent routine of all 5 daily prayers.', category: 'prayer', sortOrder: 2 },
  { dimension: 'islamic', ageBand: 'upper_primary', title: 'Read Quran with basic tajweed', description: 'Recite Quran observing basic tajweed rules.', category: 'quran', sortOrder: 3 },
  { dimension: 'islamic', ageBand: 'upper_primary', title: 'Fast during Ramadan (partial or full)', description: 'Begin fasting days during Ramadan with family support.', category: 'worship', sortOrder: 4 },
  { dimension: 'islamic', ageBand: 'upper_primary', title: 'Understand the meaning of prayer', description: 'Learn and reflect on what is said during each part of salah.', category: 'prayer', sortOrder: 5 },
];

const islamicSecondary: GoalTemplateSeed[] = [
  { dimension: 'islamic', ageBand: 'secondary', title: 'Read and reflect on Quran daily', description: 'Establish a daily habit of reading and contemplating Quran.', category: 'quran', sortOrder: 1 },
  { dimension: 'islamic', ageBand: 'secondary', title: 'Pray all 5 prayers on time', description: 'Maintain consistent, timely performance of all daily prayers.', category: 'prayer', sortOrder: 2 },
  { dimension: 'islamic', ageBand: 'secondary', title: 'Study a book of hadith', description: 'Read and discuss hadiths from Bukhari, Muslim, or Nawawi 40.', category: 'hadith', sortOrder: 3 },
  { dimension: 'islamic', ageBand: 'secondary', title: 'Fast the full month of Ramadan', description: 'Complete the full month of fasting as obligatory worship.', category: 'worship', sortOrder: 4 },
  { dimension: 'islamic', ageBand: 'secondary', title: 'Understand Islamic ethics and apply them', description: 'Study Islamic moral principles and practise them in daily life.', category: 'character', sortOrder: 5 },
];

// --- Physical ---

const physicalEarlyYears: GoalTemplateSeed[] = [
  { dimension: 'physical', ageBand: 'early_years', title: 'Run and jump confidently', description: 'Move with coordination, running and jumping during play.', category: 'gross-motor', sortOrder: 1 },
  { dimension: 'physical', ageBand: 'early_years', title: 'Catch a large ball', description: 'Catch a gently thrown ball using both hands.', category: 'coordination', sortOrder: 2 },
  { dimension: 'physical', ageBand: 'early_years', title: 'Use scissors safely', description: 'Cut along a straight line with child-safe scissors.', category: 'fine-motor', sortOrder: 3 },
  { dimension: 'physical', ageBand: 'early_years', title: 'Balance on one foot for 5 seconds', description: 'Stand on one foot with reasonable stability.', category: 'balance', sortOrder: 4 },
  { dimension: 'physical', ageBand: 'early_years', title: 'Dress independently', description: 'Put on and take off clothes without assistance.', category: 'self-care', sortOrder: 5 },
];

const physicalPrimary: GoalTemplateSeed[] = [
  { dimension: 'physical', ageBand: 'primary', title: 'Learn to swim', description: 'Swim at least 25 metres unaided in deep water.', category: 'sport', sortOrder: 1 },
  { dimension: 'physical', ageBand: 'primary', title: 'Ride a bicycle without stabilisers', description: 'Cycle confidently without training wheels.', category: 'gross-motor', sortOrder: 2 },
  { dimension: 'physical', ageBand: 'primary', title: 'Play a team sport regularly', description: 'Participate in a team sport like football, basketball, or cricket.', category: 'sport', sortOrder: 3 },
  { dimension: 'physical', ageBand: 'primary', title: 'Develop good handwriting', description: 'Write legibly with consistent letter size and spacing.', category: 'fine-motor', sortOrder: 4 },
  { dimension: 'physical', ageBand: 'primary', title: 'Be active for 60 minutes daily', description: 'Engage in physical activity for at least an hour each day.', category: 'fitness', sortOrder: 5 },
];

const physicalUpperPrimary: GoalTemplateSeed[] = [
  { dimension: 'physical', ageBand: 'upper_primary', title: 'Learn a martial art or self-defence', description: 'Begin formal training in a martial art discipline.', category: 'sport', sortOrder: 1 },
  { dimension: 'physical', ageBand: 'upper_primary', title: 'Maintain good posture', description: 'Sit and stand with correct posture during daily activities.', category: 'health', sortOrder: 2 },
  { dimension: 'physical', ageBand: 'upper_primary', title: 'Understand basic nutrition', description: 'Know which foods are healthy and make good choices.', category: 'nutrition', sortOrder: 3 },
  { dimension: 'physical', ageBand: 'upper_primary', title: 'Compete in a sport or athletic event', description: 'Participate in a school or community sporting competition.', category: 'sport', sortOrder: 4 },
  { dimension: 'physical', ageBand: 'upper_primary', title: 'Maintain a consistent sleep schedule', description: 'Go to bed and wake up at regular times on school days.', category: 'health', sortOrder: 5 },
];

const physicalSecondary: GoalTemplateSeed[] = [
  { dimension: 'physical', ageBand: 'secondary', title: 'Establish a regular exercise routine', description: 'Exercise at least 3-4 times per week with intentional workouts.', category: 'fitness', sortOrder: 1 },
  { dimension: 'physical', ageBand: 'secondary', title: 'Learn proper nutrition basics', description: 'Understand macronutrients, hydration, and balanced meal planning.', category: 'nutrition', sortOrder: 2 },
  { dimension: 'physical', ageBand: 'secondary', title: 'Achieve a personal fitness goal', description: 'Set and reach a measurable fitness target (e.g. run 5k).', category: 'fitness', sortOrder: 3 },
  { dimension: 'physical', ageBand: 'secondary', title: 'Practice good hygiene habits', description: 'Maintain consistent personal hygiene without reminders.', category: 'self-care', sortOrder: 4 },
  { dimension: 'physical', ageBand: 'secondary', title: 'Manage screen time responsibly', description: 'Limit recreational screen time and balance with physical activity.', category: 'health', sortOrder: 5 },
];

// --- Social-Emotional ---

const socialEarlyYears: GoalTemplateSeed[] = [
  { dimension: 'social_emotional', ageBand: 'early_years', title: 'Share toys with peers', description: 'Take turns and share toys during playtime without prompting.', category: 'social', sortOrder: 1 },
  { dimension: 'social_emotional', ageBand: 'early_years', title: 'Express feelings with words', description: 'Use words to communicate emotions instead of actions.', category: 'emotional', sortOrder: 2 },
  { dimension: 'social_emotional', ageBand: 'early_years', title: 'Say please and thank you', description: 'Use polite words consistently in daily interactions.', category: 'manners', sortOrder: 3 },
  { dimension: 'social_emotional', ageBand: 'early_years', title: 'Separate from parent without distress', description: 'Stay comfortably at nursery or with caregivers.', category: 'emotional', sortOrder: 4 },
  { dimension: 'social_emotional', ageBand: 'early_years', title: 'Play cooperatively with others', description: 'Engage in group play with basic cooperation skills.', category: 'social', sortOrder: 5 },
  { dimension: 'social_emotional', ageBand: 'early_years', title: 'Follow simple rules', description: 'Understand and follow basic rules at home and school.', category: 'self-regulation', sortOrder: 6 },
];

const socialPrimary: GoalTemplateSeed[] = [
  { dimension: 'social_emotional', ageBand: 'primary', title: 'Make and keep a friend', description: 'Develop and maintain at least one meaningful friendship.', category: 'social', sortOrder: 1 },
  { dimension: 'social_emotional', ageBand: 'primary', title: 'Manage anger without hitting', description: 'Use calming strategies when feeling angry or frustrated.', category: 'self-regulation', sortOrder: 2 },
  { dimension: 'social_emotional', ageBand: 'primary', title: 'Show empathy to others', description: 'Recognise when others are upset and offer comfort.', category: 'emotional', sortOrder: 3 },
  { dimension: 'social_emotional', ageBand: 'primary', title: 'Resolve conflicts with words', description: 'Talk through disagreements rather than reacting physically.', category: 'social', sortOrder: 4 },
  { dimension: 'social_emotional', ageBand: 'primary', title: 'Accept losing gracefully', description: 'Handle disappointment in games and competitions positively.', category: 'resilience', sortOrder: 5 },
];

const socialUpperPrimary: GoalTemplateSeed[] = [
  { dimension: 'social_emotional', ageBand: 'upper_primary', title: 'Navigate peer pressure', description: 'Recognise and resist negative peer pressure situations.', category: 'social', sortOrder: 1 },
  { dimension: 'social_emotional', ageBand: 'upper_primary', title: 'Express opinions respectfully', description: 'Share views confidently while respecting others opinions.', category: 'communication', sortOrder: 2 },
  { dimension: 'social_emotional', ageBand: 'upper_primary', title: 'Develop a growth mindset', description: 'View challenges as opportunities to learn and improve.', category: 'resilience', sortOrder: 3 },
  { dimension: 'social_emotional', ageBand: 'upper_primary', title: 'Manage disappointment constructively', description: 'Process setbacks without prolonged negativity.', category: 'emotional', sortOrder: 4 },
  { dimension: 'social_emotional', ageBand: 'upper_primary', title: 'Show kindness to classmates', description: 'Actively include and support peers in daily interactions.', category: 'social', sortOrder: 5 },
];

const socialSecondary: GoalTemplateSeed[] = [
  { dimension: 'social_emotional', ageBand: 'secondary', title: 'Build healthy relationships', description: 'Form and maintain positive friendships based on mutual respect.', category: 'social', sortOrder: 1 },
  { dimension: 'social_emotional', ageBand: 'secondary', title: 'Manage stress effectively', description: 'Use healthy coping strategies when feeling overwhelmed.', category: 'emotional', sortOrder: 2 },
  { dimension: 'social_emotional', ageBand: 'secondary', title: 'Communicate assertively', description: 'Express needs and boundaries clearly and respectfully.', category: 'communication', sortOrder: 3 },
  { dimension: 'social_emotional', ageBand: 'secondary', title: 'Develop self-awareness', description: 'Understand personal strengths, weaknesses, and triggers.', category: 'emotional', sortOrder: 4 },
  { dimension: 'social_emotional', ageBand: 'secondary', title: 'Show leadership in group settings', description: 'Take initiative and guide others in collaborative situations.', category: 'leadership', sortOrder: 5 },
];

// --- Behavioural ---

const behaviouralEarlyYears: GoalTemplateSeed[] = [
  { dimension: 'behavioural', ageBand: 'early_years', title: 'Follow a daily routine', description: 'Complete morning and bedtime routines with minimal prompting.', category: 'routine', sortOrder: 1 },
  { dimension: 'behavioural', ageBand: 'early_years', title: 'Tidy up after play', description: 'Put toys and materials away after finishing an activity.', category: 'responsibility', sortOrder: 2 },
  { dimension: 'behavioural', ageBand: 'early_years', title: 'Wait their turn', description: 'Wait patiently when taking turns in games and activities.', category: 'self-control', sortOrder: 3 },
  { dimension: 'behavioural', ageBand: 'early_years', title: 'Listen when spoken to', description: 'Make eye contact and listen when an adult is speaking.', category: 'respect', sortOrder: 4 },
  { dimension: 'behavioural', ageBand: 'early_years', title: 'Use an indoor voice', description: 'Adjust volume appropriately for indoor settings.', category: 'self-control', sortOrder: 5 },
];

const behaviouralPrimary: GoalTemplateSeed[] = [
  { dimension: 'behavioural', ageBand: 'primary', title: 'Complete chores without reminders', description: 'Do assigned household tasks independently and consistently.', category: 'responsibility', sortOrder: 1 },
  { dimension: 'behavioural', ageBand: 'primary', title: 'Be ready for school on time', description: 'Prepare bag, uniform, and be ready to leave on schedule.', category: 'routine', sortOrder: 2 },
  { dimension: 'behavioural', ageBand: 'primary', title: 'Follow classroom rules', description: 'Consistently follow school and classroom expectations.', category: 'respect', sortOrder: 3 },
  { dimension: 'behavioural', ageBand: 'primary', title: 'Limit screen time to agreed hours', description: 'Respect agreed screen time limits without arguments.', category: 'self-control', sortOrder: 4 },
  { dimension: 'behavioural', ageBand: 'primary', title: 'Apologise when wrong', description: 'Recognise mistakes and offer sincere apologies.', category: 'accountability', sortOrder: 5 },
];

const behaviouralUpperPrimary: GoalTemplateSeed[] = [
  { dimension: 'behavioural', ageBand: 'upper_primary', title: 'Manage time independently', description: 'Plan and use time wisely across homework, chores, and leisure.', category: 'time-management', sortOrder: 1 },
  { dimension: 'behavioural', ageBand: 'upper_primary', title: 'Take responsibility for actions', description: 'Own up to mistakes and accept consequences maturely.', category: 'accountability', sortOrder: 2 },
  { dimension: 'behavioural', ageBand: 'upper_primary', title: 'Show respect to elders and teachers', description: 'Speak and behave respectfully with adults consistently.', category: 'respect', sortOrder: 3 },
  { dimension: 'behavioural', ageBand: 'upper_primary', title: 'Keep personal space organised', description: 'Maintain a tidy room and organised school materials.', category: 'responsibility', sortOrder: 4 },
  { dimension: 'behavioural', ageBand: 'upper_primary', title: 'Practise honesty consistently', description: 'Tell the truth even when it is difficult.', category: 'integrity', sortOrder: 5 },
];

const behaviouralSecondary: GoalTemplateSeed[] = [
  { dimension: 'behavioural', ageBand: 'secondary', title: 'Demonstrate self-discipline', description: 'Make responsible choices about priorities and commitments.', category: 'self-control', sortOrder: 1 },
  { dimension: 'behavioural', ageBand: 'secondary', title: 'Manage finances responsibly', description: 'Budget pocket money and make thoughtful spending decisions.', category: 'financial', sortOrder: 2 },
  { dimension: 'behavioural', ageBand: 'secondary', title: 'Be accountable for commitments', description: 'Follow through on promises and obligations reliably.', category: 'accountability', sortOrder: 3 },
  { dimension: 'behavioural', ageBand: 'secondary', title: 'Use technology responsibly', description: 'Use devices and social media wisely and safely.', category: 'digital-citizenship', sortOrder: 4 },
  { dimension: 'behavioural', ageBand: 'secondary', title: 'Help with household responsibilities', description: 'Contribute meaningfully to running the household.', category: 'responsibility', sortOrder: 5 },
];

// --- Aspirational ---

const aspirationalEarlyYears: GoalTemplateSeed[] = [
  { dimension: 'aspirational', ageBand: 'early_years', title: 'Talk about what they want to be', description: 'Express interests and dream jobs during conversation.', category: 'identity', sortOrder: 1 },
  { dimension: 'aspirational', ageBand: 'early_years', title: 'Try new activities bravely', description: 'Be willing to attempt new experiences without excessive fear.', category: 'courage', sortOrder: 2 },
  { dimension: 'aspirational', ageBand: 'early_years', title: 'Show curiosity and ask questions', description: 'Ask why and how questions about the world around them.', category: 'curiosity', sortOrder: 3 },
  { dimension: 'aspirational', ageBand: 'early_years', title: 'Complete a simple project', description: 'Finish an art project, puzzle, or construction to completion.', category: 'perseverance', sortOrder: 4 },
  { dimension: 'aspirational', ageBand: 'early_years', title: 'Help someone without being asked', description: 'Offer help to family or friends spontaneously.', category: 'service', sortOrder: 5 },
];

const aspirationalPrimary: GoalTemplateSeed[] = [
  { dimension: 'aspirational', ageBand: 'primary', title: 'Set a personal goal and achieve it', description: 'Choose a meaningful goal and work towards completing it.', category: 'goal-setting', sortOrder: 1 },
  { dimension: 'aspirational', ageBand: 'primary', title: 'Explore a new hobby or interest', description: 'Try a new activity and dedicate time to developing it.', category: 'exploration', sortOrder: 2 },
  { dimension: 'aspirational', ageBand: 'primary', title: 'Read about inspiring people', description: 'Learn about role models from diverse backgrounds.', category: 'inspiration', sortOrder: 3 },
  { dimension: 'aspirational', ageBand: 'primary', title: 'Participate in a community event', description: 'Join a charity event, fundraiser, or community activity.', category: 'service', sortOrder: 4 },
  { dimension: 'aspirational', ageBand: 'primary', title: 'Learn a new skill outside school', description: 'Develop a skill such as cooking, coding, or gardening.', category: 'skill-building', sortOrder: 5 },
];

const aspirationalUpperPrimary: GoalTemplateSeed[] = [
  { dimension: 'aspirational', ageBand: 'upper_primary', title: 'Identify personal strengths', description: 'Recognise and articulate what they are good at.', category: 'self-awareness', sortOrder: 1 },
  { dimension: 'aspirational', ageBand: 'upper_primary', title: 'Research a career of interest', description: 'Learn about a profession they find interesting.', category: 'career', sortOrder: 2 },
  { dimension: 'aspirational', ageBand: 'upper_primary', title: 'Start a small project or business', description: 'Launch a simple entrepreneurial or creative project.', category: 'entrepreneurship', sortOrder: 3 },
  { dimension: 'aspirational', ageBand: 'upper_primary', title: 'Volunteer regularly', description: 'Commit to regular volunteering in the community.', category: 'service', sortOrder: 4 },
  { dimension: 'aspirational', ageBand: 'upper_primary', title: 'Keep a journal of aspirations', description: 'Write regularly about goals, dreams, and progress.', category: 'reflection', sortOrder: 5 },
];

const aspirationalSecondary: GoalTemplateSeed[] = [
  { dimension: 'aspirational', ageBand: 'secondary', title: 'Create a vision for their future', description: 'Develop a clear picture of who they want to become.', category: 'vision', sortOrder: 1 },
  { dimension: 'aspirational', ageBand: 'secondary', title: 'Pursue a passion project', description: 'Dedicate significant time to a meaningful personal project.', category: 'passion', sortOrder: 2 },
  { dimension: 'aspirational', ageBand: 'secondary', title: 'Seek mentorship', description: 'Find and build a relationship with a mentor in an area of interest.', category: 'networking', sortOrder: 3 },
  { dimension: 'aspirational', ageBand: 'secondary', title: 'Set academic and career goals', description: 'Define specific goals for education and future career path.', category: 'goal-setting', sortOrder: 4 },
  { dimension: 'aspirational', ageBand: 'secondary', title: 'Lead a community initiative', description: 'Organise and lead a project that benefits others.', category: 'leadership', sortOrder: 5 },
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
