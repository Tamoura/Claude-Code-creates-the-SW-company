/**
 * prisma/seed.ts — Database seed script
 *
 * Populates the database with:
 * - 1 Organization (demo-org)
 * - 1 AlgorithmVersion (v1, active)
 * - 1 AssessmentTemplate (generic, equal weights)
 * - 24 BehavioralIndicators (6 per dimension, mix of OBSERVABLE and SELF_REPORT)
 * - 50 Questions (mix of SCENARIO and SELF_REPORT)
 * - 1 Demo user (demo@ai-fluency.com / Demo1234)
 *
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS = {
  type: 2 as const, // argon2id
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

// -- Behavioral Indicators (24 total: 6 per dimension) -------------------------

interface IndicatorDef {
  shortCode: string;
  name: string;
  description: string;
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';
  track: 'OBSERVABLE' | 'SELF_REPORT';
  prevalenceWeight: number;
  sortOrder: number;
}

const indicators: IndicatorDef[] = [
  // DELEGATION (6)
  {
    shortCode: 'DELEGATION_TASK_SUITABILITY',
    name: 'Identify task suitability for AI',
    description: 'Can identify which tasks are appropriate to delegate to AI tools versus those requiring human judgment.',
    dimension: 'DELEGATION',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.9,
    sortOrder: 1,
  },
  {
    shortCode: 'DELEGATION_REASONING',
    name: 'Reason about delegation decisions',
    description: 'Can articulate why a task should or should not be delegated to AI, considering risk and complexity.',
    dimension: 'DELEGATION',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.7,
    sortOrder: 2,
  },
  {
    shortCode: 'DELEGATION_RISK_ASSESSMENT',
    name: 'Assess delegation risk',
    description: 'Evaluates the risks of delegating high-stakes tasks to AI and applies appropriate safeguards.',
    dimension: 'DELEGATION',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.6,
    sortOrder: 3,
  },
  {
    shortCode: 'DELEGATION_CONFIDENCE',
    name: 'Confidence in delegation choices',
    description: 'Self-reported confidence in deciding when to use AI assistance for work tasks.',
    dimension: 'DELEGATION',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.8,
    sortOrder: 4,
  },
  {
    shortCode: 'DELEGATION_FREQUENCY',
    name: 'Frequency of appropriate delegation',
    description: 'Self-reported frequency of delegating suitable tasks to AI tools in daily work.',
    dimension: 'DELEGATION',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.7,
    sortOrder: 5,
  },
  {
    shortCode: 'DELEGATION_BOUNDARY_AWARENESS',
    name: 'Awareness of AI boundaries',
    description: 'Self-reported understanding of what AI can and cannot reliably handle.',
    dimension: 'DELEGATION',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.8,
    sortOrder: 6,
  },

  // DESCRIPTION (6)
  {
    shortCode: 'DESCRIPTION_PROMPT_CLARITY',
    name: 'Write clear prompts',
    description: 'Constructs prompts that are specific, well-structured, and provide adequate context for the AI.',
    dimension: 'DESCRIPTION',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.9,
    sortOrder: 7,
  },
  {
    shortCode: 'DESCRIPTION_CONTEXT_PROVISION',
    name: 'Provide relevant context',
    description: 'Includes necessary background information, constraints, and examples when interacting with AI.',
    dimension: 'DESCRIPTION',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.8,
    sortOrder: 8,
  },
  {
    shortCode: 'DESCRIPTION_ITERATIVE_REFINEMENT',
    name: 'Refine prompts iteratively',
    description: 'Can refine and improve prompts based on AI output quality, adjusting specificity and constraints.',
    dimension: 'DESCRIPTION',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.7,
    sortOrder: 9,
  },
  {
    shortCode: 'DESCRIPTION_FORMAT_SPECIFICATION',
    name: 'Specify output format',
    description: 'Self-reported practice of specifying desired format, length, and structure in AI interactions.',
    dimension: 'DESCRIPTION',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.8,
    sortOrder: 10,
  },
  {
    shortCode: 'DESCRIPTION_ROLE_SETTING',
    name: 'Set AI role and persona',
    description: 'Self-reported frequency of using role/persona instructions to guide AI behavior.',
    dimension: 'DESCRIPTION',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.6,
    sortOrder: 11,
  },
  {
    shortCode: 'DESCRIPTION_CONSTRAINT_AWARENESS',
    name: 'Awareness of prompt constraints',
    description: 'Self-reported understanding of how prompt structure affects AI output quality.',
    dimension: 'DESCRIPTION',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.7,
    sortOrder: 12,
  },

  // DISCERNMENT (6)
  {
    shortCode: 'DISCERNMENT_ACCURACY_EVALUATION',
    name: 'Evaluate output accuracy',
    description: 'Can identify factual errors, hallucinations, and inaccuracies in AI-generated content.',
    dimension: 'DISCERNMENT',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.9,
    sortOrder: 13,
  },
  {
    shortCode: 'DISCERNMENT_MISSING_CONTEXT',
    name: 'Identify missing context',
    description: 'Recognizes when AI output lacks critical information or makes assumptions not supported by the input.',
    dimension: 'DISCERNMENT',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.8,
    sortOrder: 14,
  },
  {
    shortCode: 'DISCERNMENT_BIAS_DETECTION',
    name: 'Detect AI bias',
    description: 'Can identify bias, stereotyping, or unbalanced perspectives in AI-generated content.',
    dimension: 'DISCERNMENT',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.7,
    sortOrder: 15,
  },
  {
    shortCode: 'DISCERNMENT_CONFIDENCE_CALIBRATION',
    name: 'Calibrate confidence in AI output',
    description: 'Self-reported ability to appropriately calibrate trust in AI outputs based on task type and domain.',
    dimension: 'DISCERNMENT',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.8,
    sortOrder: 16,
  },
  {
    shortCode: 'DISCERNMENT_CRITICAL_QUESTIONING',
    name: 'Question AI reasoning',
    description: 'Self-reported tendency to question and verify AI reasoning rather than accepting it at face value.',
    dimension: 'DISCERNMENT',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.7,
    sortOrder: 17,
  },
  {
    shortCode: 'DISCERNMENT_SOURCE_VERIFICATION',
    name: 'Verify AI sources',
    description: 'Self-reported practice of cross-referencing AI-cited sources and claims with authoritative references.',
    dimension: 'DISCERNMENT',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.6,
    sortOrder: 18,
  },

  // DILIGENCE (6)
  {
    shortCode: 'DILIGENCE_OUTPUT_VERIFICATION',
    name: 'Verify AI output before use',
    description: 'Systematically reviews and validates AI-generated content before incorporating it into deliverables.',
    dimension: 'DILIGENCE',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.9,
    sortOrder: 19,
  },
  {
    shortCode: 'DILIGENCE_ACCOUNTABILITY',
    name: 'Maintain accountability',
    description: 'Takes personal responsibility for AI-assisted work products and their consequences.',
    dimension: 'DILIGENCE',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.8,
    sortOrder: 20,
  },
  {
    shortCode: 'DILIGENCE_ETHICAL_AWARENESS',
    name: 'Apply ethical oversight',
    description: 'Considers ethical implications of AI use including privacy, fairness, and intellectual property.',
    dimension: 'DILIGENCE',
    track: 'OBSERVABLE',
    prevalenceWeight: 0.7,
    sortOrder: 21,
  },
  {
    shortCode: 'DILIGENCE_REVIEW_HABIT',
    name: 'Review habit consistency',
    description: 'Self-reported consistency of reviewing AI outputs before sharing or using them.',
    dimension: 'DILIGENCE',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.8,
    sortOrder: 22,
  },
  {
    shortCode: 'DILIGENCE_DOCUMENTATION',
    name: 'Document AI usage',
    description: 'Self-reported practice of documenting when and how AI was used in work products.',
    dimension: 'DILIGENCE',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.6,
    sortOrder: 23,
  },
  {
    shortCode: 'DILIGENCE_CONTINUOUS_IMPROVEMENT',
    name: 'Improve AI collaboration',
    description: 'Self-reported effort to continuously learn and improve how they work with AI tools.',
    dimension: 'DILIGENCE',
    track: 'SELF_REPORT',
    prevalenceWeight: 0.7,
    sortOrder: 24,
  },
];

// -- Questions (50 total) ------------------------------------------------------

interface QuestionDef {
  indicatorShortCode: string;
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';
  interactionMode: 'AUTOMATION' | 'AUGMENTATION' | 'AGENCY';
  questionType: 'SCENARIO' | 'SELF_REPORT';
  text: string;
  optionsJson: unknown;
}

const scenarioQuestions: QuestionDef[] = [
  // DELEGATION SCENARIOS (8)
  {
    indicatorShortCode: 'DELEGATION_TASK_SUITABILITY',
    dimension: 'DELEGATION',
    interactionMode: 'AUTOMATION',
    questionType: 'SCENARIO',
    text: 'You need to schedule 50 recurring meetings with different time zones. Which approach best demonstrates effective AI delegation?',
    optionsJson: [
      { key: 'A', text: 'Manually schedule each meeting, checking each time zone yourself', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Use an AI scheduling assistant to propose times, then review and confirm each one', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'Delegate entirely to AI and send invites without reviewing', isCorrect: false, score: 0.0 },
      { key: 'D', text: 'Ask AI to generate a spreadsheet of time zones, then manually schedule', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DELEGATION_TASK_SUITABILITY',
    dimension: 'DELEGATION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'A colleague asks you to use AI to write a legal contract for a major client. What is the most appropriate response?',
    optionsJson: [
      { key: 'A', text: 'Use AI to draft it and send directly to the client', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Decline entirely — AI should never be used for legal documents', isCorrect: false, score: 0.0 },
      { key: 'C', text: 'Use AI to create an initial draft, then have it reviewed by legal counsel', isCorrect: true, score: 1.0 },
      { key: 'D', text: 'Use AI to research contract templates, then write the contract yourself from scratch', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DELEGATION_REASONING',
    dimension: 'DELEGATION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'Your team is deciding whether to use AI to analyze customer sentiment from support tickets. Which reasoning best justifies this delegation?',
    optionsJson: [
      { key: 'A', text: 'AI is faster, so we should always use it for text analysis', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Sentiment analysis at scale is well-suited for AI, but edge cases and escalations need human review', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'We should avoid AI because it might misinterpret sarcasm', isCorrect: false, score: 0.0 },
      { key: 'D', text: 'AI can handle the analysis, and we can check a random sample for accuracy', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DELEGATION_RISK_ASSESSMENT',
    dimension: 'DELEGATION',
    interactionMode: 'AGENCY',
    questionType: 'SCENARIO',
    text: 'You are considering using AI to pre-screen job applications. What is the most important risk to assess before delegating?',
    optionsJson: [
      { key: 'A', text: 'Whether the AI can process applications quickly enough', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Whether the AI model has been validated for fairness and bias across demographic groups', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'Whether candidates will know AI was used in screening', isCorrect: false, score: 0.5 },
      { key: 'D', text: 'Whether the AI can parse different resume formats', isCorrect: false, score: 0.0 },
    ],
  },

  // DESCRIPTION SCENARIOS (8)
  {
    indicatorShortCode: 'DESCRIPTION_PROMPT_CLARITY',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'You need AI to write a project status report. Which prompt would produce the best result?',
    optionsJson: [
      { key: 'A', text: '"Write a status report for my project"', isCorrect: false, score: 0.0 },
      { key: 'B', text: '"Write a 1-page status report for the Q2 mobile app migration project. Include: milestones completed, current blockers, next sprint goals. Audience: VP of Engineering. Tone: professional, concise."', isCorrect: true, score: 1.0 },
      { key: 'C', text: '"I need a detailed report about everything happening in the project with all the information"', isCorrect: false, score: 0.0 },
      { key: 'D', text: '"Write a project status report. Make it good and professional."', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DESCRIPTION_PROMPT_CLARITY',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUTOMATION',
    questionType: 'SCENARIO',
    text: 'You want AI to convert a dataset from CSV to a specific JSON format. Which approach yields the most reliable results?',
    optionsJson: [
      { key: 'A', text: 'Paste the CSV and say "convert to JSON"', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Provide the CSV, show the exact JSON schema you want with a sample row, and specify how to handle null values', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'Describe the JSON format in words without showing an example', isCorrect: false, score: 0.5 },
      { key: 'D', text: 'Ask AI to suggest the best JSON format for the data', isCorrect: false, score: 0.0 },
    ],
  },
  {
    indicatorShortCode: 'DESCRIPTION_CONTEXT_PROVISION',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'You are using AI to draft a customer email about a service outage. What context is most critical to provide?',
    optionsJson: [
      { key: 'A', text: 'Just the fact that there was an outage', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'The outage details, affected services, resolution timeline, company tone guidelines, and whether compensation is being offered', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'A general description of the company and its services', isCorrect: false, score: 0.0 },
      { key: 'D', text: 'The outage details and affected services', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DESCRIPTION_ITERATIVE_REFINEMENT',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'An AI generates a marketing email but the tone is too formal for your brand. What is the best next step?',
    optionsJson: [
      { key: 'A', text: 'Rewrite the entire email yourself', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Ask AI to regenerate with a completely different prompt', isCorrect: false, score: 0.0 },
      { key: 'C', text: 'Provide specific feedback: "Rewrite with a conversational tone, shorter sentences, and add a touch of humor. Here is an example of our brand voice: [example]"', isCorrect: true, score: 1.0 },
      { key: 'D', text: 'Ask AI to make it "less formal"', isCorrect: false, score: 0.5 },
    ],
  },

  // DISCERNMENT SCENARIOS (8)
  {
    indicatorShortCode: 'DISCERNMENT_ACCURACY_EVALUATION',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'An AI generates a market research summary that cites a study from "Stanford AI Index 2024" with specific statistics. What should you do first?',
    optionsJson: [
      { key: 'A', text: 'Include the citation since Stanford is a reputable source', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Verify the specific study exists and the cited statistics are accurate by checking the actual Stanford AI Index report', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'Remove the citation to be safe', isCorrect: false, score: 0.5 },
      { key: 'D', text: 'Ask the AI to confirm the accuracy of its own citation', isCorrect: false, score: 0.0 },
    ],
  },
  {
    indicatorShortCode: 'DISCERNMENT_ACCURACY_EVALUATION',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'AI provides a code snippet that "implements industry-standard encryption." How do you evaluate this claim?',
    optionsJson: [
      { key: 'A', text: 'Run the code and check if it works without errors', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Trust it since LLMs are trained on code from top developers', isCorrect: false, score: 0.0 },
      { key: 'C', text: 'Verify the specific algorithm, key size, and implementation against OWASP or NIST guidelines', isCorrect: true, score: 1.0 },
      { key: 'D', text: 'Ask a colleague if the code looks correct', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DISCERNMENT_MISSING_CONTEXT',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'You asked AI to analyze your company quarterly revenue. It provides a confident analysis but you notice it did not mention seasonality. What does this indicate?',
    optionsJson: [
      { key: 'A', text: 'Seasonality is not relevant to your business', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'The AI made an implicit assumption that seasonal patterns are not significant, which needs to be validated', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'The AI already accounted for seasonality internally', isCorrect: false, score: 0.0 },
      { key: 'D', text: 'You should ask the AI to redo the analysis', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DISCERNMENT_BIAS_DETECTION',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'AI writes a job description that includes "looking for a young, energetic team player." What is the primary concern?',
    optionsJson: [
      { key: 'A', text: 'The language is too informal for a job posting', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'The word "young" introduces age discrimination bias and may violate employment law', isCorrect: true, score: 1.0 },
      { key: 'C', text: '"Team player" is a cliche that should be replaced', isCorrect: false, score: 0.0 },
      { key: 'D', text: 'The description needs more specific qualifications', isCorrect: false, score: 0.5 },
    ],
  },

  // DILIGENCE SCENARIOS (6)
  {
    indicatorShortCode: 'DILIGENCE_OUTPUT_VERIFICATION',
    dimension: 'DILIGENCE',
    interactionMode: 'AUGMENTATION',
    questionType: 'SCENARIO',
    text: 'AI generates a financial projection spreadsheet with formulas. Before sharing it with stakeholders, what is the minimum verification you should perform?',
    optionsJson: [
      { key: 'A', text: 'Check that the totals look reasonable', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Verify each formula is correct, spot-check calculations against known values, and validate assumptions match the approved financial model', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'Run the spreadsheet through a second AI for verification', isCorrect: false, score: 0.0 },
      { key: 'D', text: 'Check the formulas for obvious errors and verify the final numbers', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DILIGENCE_ACCOUNTABILITY',
    dimension: 'DILIGENCE',
    interactionMode: 'AGENCY',
    questionType: 'SCENARIO',
    text: 'A client discovers an error in a report you generated using AI assistance. What is the most professional response?',
    optionsJson: [
      { key: 'A', text: '"The AI tool made an error in its analysis"', isCorrect: false, score: 0.0 },
      { key: 'B', text: '"I take full responsibility for the error. I should have caught this in my review. Here is the corrected report and the steps I am taking to prevent this in the future."', isCorrect: true, score: 1.0 },
      { key: 'C', text: '"This was an edge case that even our advanced tools could not catch"', isCorrect: false, score: 0.0 },
      { key: 'D', text: '"I apologize for the error. I will add an additional review step going forward."', isCorrect: false, score: 0.5 },
    ],
  },
  {
    indicatorShortCode: 'DILIGENCE_ETHICAL_AWARENESS',
    dimension: 'DILIGENCE',
    interactionMode: 'AGENCY',
    questionType: 'SCENARIO',
    text: 'Your manager asks you to use AI to generate synthetic customer reviews to boost your product rating. What should you do?',
    optionsJson: [
      { key: 'A', text: 'Comply since the manager approved it', isCorrect: false, score: 0.0 },
      { key: 'B', text: 'Decline and explain this is deceptive, potentially illegal, and could damage the company reputation if discovered', isCorrect: true, score: 1.0 },
      { key: 'C', text: 'Create the reviews but make them obviously AI-generated so people can tell', isCorrect: false, score: 0.0 },
      { key: 'D', text: 'Suggest using AI to help real customers write better reviews instead', isCorrect: false, score: 0.5 },
    ],
  },
];

// Self-report questions (Likert 1-5)
const selfReportQuestions: QuestionDef[] = [
  // DELEGATION SELF_REPORT (5)
  {
    indicatorShortCode: 'DELEGATION_CONFIDENCE',
    dimension: 'DELEGATION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How confident are you in your ability to determine which work tasks are appropriate to delegate to AI tools?',
    optionsJson: { min: 1, max: 5, labels: ['Not at all confident', 'Slightly confident', 'Moderately confident', 'Very confident', 'Extremely confident'] },
  },
  {
    indicatorShortCode: 'DELEGATION_CONFIDENCE',
    dimension: 'DELEGATION',
    interactionMode: 'AUTOMATION',
    questionType: 'SELF_REPORT',
    text: 'When faced with a new type of task, how confident are you in assessing whether AI could handle it effectively?',
    optionsJson: { min: 1, max: 5, labels: ['Not at all confident', 'Slightly confident', 'Moderately confident', 'Very confident', 'Extremely confident'] },
  },
  {
    indicatorShortCode: 'DELEGATION_FREQUENCY',
    dimension: 'DELEGATION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How often do you use AI tools to assist with tasks that are well-suited for AI delegation?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },
  {
    indicatorShortCode: 'DELEGATION_BOUNDARY_AWARENESS',
    dimension: 'DELEGATION',
    interactionMode: 'AGENCY',
    questionType: 'SELF_REPORT',
    text: 'How well do you understand the limitations of current AI tools for different types of work tasks?',
    optionsJson: { min: 1, max: 5, labels: ['Very poorly', 'Somewhat poorly', 'Moderately well', 'Well', 'Very well'] },
  },
  {
    indicatorShortCode: 'DELEGATION_BOUNDARY_AWARENESS',
    dimension: 'DELEGATION',
    interactionMode: 'AUTOMATION',
    questionType: 'SELF_REPORT',
    text: 'How aware are you of situations where AI delegation could lead to errors or negative outcomes?',
    optionsJson: { min: 1, max: 5, labels: ['Not aware', 'Slightly aware', 'Moderately aware', 'Very aware', 'Extremely aware'] },
  },

  // DESCRIPTION SELF_REPORT (5)
  {
    indicatorShortCode: 'DESCRIPTION_FORMAT_SPECIFICATION',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How often do you specify the desired output format (e.g., bullet points, table, code block) when prompting AI?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },
  {
    indicatorShortCode: 'DESCRIPTION_FORMAT_SPECIFICATION',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUTOMATION',
    questionType: 'SELF_REPORT',
    text: 'When requesting AI-generated content, how consistently do you include length and detail constraints?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },
  {
    indicatorShortCode: 'DESCRIPTION_ROLE_SETTING',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How frequently do you assign a specific role or persona to AI (e.g., "Act as a senior data analyst") to improve output quality?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },
  {
    indicatorShortCode: 'DESCRIPTION_CONSTRAINT_AWARENESS',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How well do you understand how the structure and specificity of your prompts affects the quality of AI output?',
    optionsJson: { min: 1, max: 5, labels: ['Very poorly', 'Somewhat poorly', 'Moderately well', 'Well', 'Very well'] },
  },
  {
    indicatorShortCode: 'DESCRIPTION_CONSTRAINT_AWARENESS',
    dimension: 'DESCRIPTION',
    interactionMode: 'AUTOMATION',
    questionType: 'SELF_REPORT',
    text: 'How confident are you in your ability to write effective prompts for complex, multi-step tasks?',
    optionsJson: { min: 1, max: 5, labels: ['Not at all confident', 'Slightly confident', 'Moderately confident', 'Very confident', 'Extremely confident'] },
  },

  // DISCERNMENT SELF_REPORT (6)
  {
    indicatorShortCode: 'DISCERNMENT_CONFIDENCE_CALIBRATION',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How well can you gauge when AI output is likely to be accurate versus when it needs extra scrutiny?',
    optionsJson: { min: 1, max: 5, labels: ['Very poorly', 'Somewhat poorly', 'Moderately well', 'Well', 'Very well'] },
  },
  {
    indicatorShortCode: 'DISCERNMENT_CONFIDENCE_CALIBRATION',
    dimension: 'DISCERNMENT',
    interactionMode: 'AGENCY',
    questionType: 'SELF_REPORT',
    text: 'How effectively do you adjust your level of trust in AI output based on the stakes and complexity of the task?',
    optionsJson: { min: 1, max: 5, labels: ['Not at all effectively', 'Slightly effectively', 'Moderately effectively', 'Very effectively', 'Extremely effectively'] },
  },
  {
    indicatorShortCode: 'DISCERNMENT_CRITICAL_QUESTIONING',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How often do you question or push back on AI-generated conclusions rather than accepting them as given?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },
  {
    indicatorShortCode: 'DISCERNMENT_CRITICAL_QUESTIONING',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUTOMATION',
    questionType: 'SELF_REPORT',
    text: 'When AI provides a confident-sounding answer, how often do you independently verify key claims?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },
  {
    indicatorShortCode: 'DISCERNMENT_SOURCE_VERIFICATION',
    dimension: 'DISCERNMENT',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How frequently do you check the sources or references cited by AI against the original material?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },
  {
    indicatorShortCode: 'DISCERNMENT_SOURCE_VERIFICATION',
    dimension: 'DISCERNMENT',
    interactionMode: 'AGENCY',
    questionType: 'SELF_REPORT',
    text: 'When using AI for research, how often do you verify that cited studies, statistics, or quotes actually exist?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] },
  },

  // DILIGENCE SELF_REPORT (4)
  {
    indicatorShortCode: 'DILIGENCE_REVIEW_HABIT',
    dimension: 'DILIGENCE',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How consistently do you review AI-generated content before sharing it with others or using it in deliverables?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
  },
  {
    indicatorShortCode: 'DILIGENCE_REVIEW_HABIT',
    dimension: 'DILIGENCE',
    interactionMode: 'AUTOMATION',
    questionType: 'SELF_REPORT',
    text: 'When under time pressure, how often do you still perform a thorough review of AI output before using it?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
  },
  {
    indicatorShortCode: 'DILIGENCE_DOCUMENTATION',
    dimension: 'DILIGENCE',
    interactionMode: 'AUGMENTATION',
    questionType: 'SELF_REPORT',
    text: 'How often do you document or disclose when AI tools were used to create or significantly contribute to your work?',
    optionsJson: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
  },
  {
    indicatorShortCode: 'DILIGENCE_CONTINUOUS_IMPROVEMENT',
    dimension: 'DILIGENCE',
    interactionMode: 'AGENCY',
    questionType: 'SELF_REPORT',
    text: 'How actively do you seek to learn new techniques and best practices for working effectively with AI tools?',
    optionsJson: { min: 1, max: 5, labels: ['Not at all', 'Slightly', 'Moderately', 'Very actively', 'Extremely actively'] },
  },
];

const allQuestions: QuestionDef[] = [...scenarioQuestions, ...selfReportQuestions];

// -- Main seed function --------------------------------------------------------

async function main() {
  console.log('Seeding AI Fluency database...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  // 2. Algorithm Version
  const algoVersion = await prisma.algorithmVersion.upsert({
    where: { version: 1 },
    update: { isActive: true },
    create: {
      version: 1,
      description: 'Initial 4D scoring algorithm — prevalence-weighted dimension averages with discernment gap detection',
      isActive: true,
      activatedAt: new Date(),
    },
  });
  console.log(`  Algorithm version: v${algoVersion.version}`);

  // 3. Assessment Template
  let template = await prisma.assessmentTemplate.findFirst({
    where: { orgId: null, roleProfile: 'GENERIC', isActive: true },
  });
  if (!template) {
    template = await prisma.assessmentTemplate.create({
      data: {
        orgId: null,
        name: 'AI Fluency Assessment — Generic',
        description: 'Standard assessment covering all four dimensions of AI fluency: Delegation, Description, Discernment, and Diligence.',
        roleProfile: 'GENERIC',
        isCustom: false,
        dimensionWeights: {
          DELEGATION: 0.25,
          DESCRIPTION: 0.25,
          DISCERNMENT: 0.25,
          DILIGENCE: 0.25,
        },
        isActive: true,
      },
    });
  }
  console.log(`  Template: ${template.name} (${template.id})`);

  // 4. Behavioral Indicators
  for (const ind of indicators) {
    await prisma.behavioralIndicator.upsert({
      where: { shortCode: ind.shortCode },
      update: {
        name: ind.name,
        description: ind.description,
        dimension: ind.dimension,
        track: ind.track,
        prevalenceWeight: ind.prevalenceWeight,
        sortOrder: ind.sortOrder,
      },
      create: ind,
    });
  }
  console.log(`  Behavioral indicators: ${indicators.length} upserted`);

  // 5. Questions — first fetch indicator IDs
  const dbIndicators = await prisma.behavioralIndicator.findMany({
    select: { id: true, shortCode: true },
  });
  const indicatorMap = new Map(dbIndicators.map((i) => [i.shortCode, i.id]));

  // Delete existing questions to avoid duplicates on re-seed
  await prisma.response.deleteMany({});
  await prisma.question.deleteMany({});

  for (const q of allQuestions) {
    const indicatorId = indicatorMap.get(q.indicatorShortCode);
    if (!indicatorId) {
      console.warn(`  WARNING: No indicator found for shortCode ${q.indicatorShortCode}`);
      continue;
    }
    await prisma.question.create({
      data: {
        dimension: q.dimension,
        interactionMode: q.interactionMode,
        questionType: q.questionType,
        indicatorId,
        text: q.text,
        optionsJson: q.optionsJson as object,
        isActive: true,
      },
    });
  }
  console.log(`  Questions: ${allQuestions.length} created`);

  // 6. Demo user
  const passwordHash = await hash('Demo1234', ARGON2_OPTIONS);
  await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: org.id,
        email: 'demo@ai-fluency.com',
      },
    },
    update: { passwordHash },
    create: {
      orgId: org.id,
      email: 'demo@ai-fluency.com',
      firstName: 'Demo',
      lastName: 'User',
      passwordHash,
      role: 'LEARNER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('  Demo user: demo@ai-fluency.com / Demo1234');

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
