import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';

interface Question {
  id: string;
  text: string;
  options: { label: string; score: number }[];
}

const questions: Question[] = [
  {
    id: 'q1',
    text: 'What is your organization\'s current quantum computing expertise?',
    options: [
      { label: 'No knowledge or experience', score: 0 },
      { label: 'Basic awareness of quantum concepts', score: 1 },
      { label: 'Some team members have quantum computing training', score: 2 },
      { label: 'Dedicated quantum computing team or partnerships', score: 3 },
    ],
  },
  {
    id: 'q2',
    text: 'How would you describe your current computational challenges?',
    options: [
      { label: 'Most problems solved with standard computing', score: 0 },
      { label: 'Some optimization problems are computationally expensive', score: 1 },
      { label: 'Key business problems are limited by classical computing', score: 2 },
      { label: 'Critical operations require exponential compute time', score: 3 },
    ],
  },
  {
    id: 'q3',
    text: 'What is your organization\'s budget allocation for emerging technology R&D?',
    options: [
      { label: 'No dedicated R&D budget', score: 0 },
      { label: 'Small pilot budget available (<$100K)', score: 1 },
      { label: 'Moderate R&D investment ($100K-$1M)', score: 2 },
      { label: 'Significant R&D budget (>$1M)', score: 3 },
    ],
  },
  {
    id: 'q4',
    text: 'How mature is your data infrastructure?',
    options: [
      { label: 'Basic data storage, limited analytics', score: 0 },
      { label: 'Established data pipelines and analytics', score: 1 },
      { label: 'Advanced ML/AI capabilities deployed', score: 2 },
      { label: 'Cutting-edge data science with HPC resources', score: 3 },
    ],
  },
  {
    id: 'q5',
    text: 'What is your industry\'s quantum computing adoption level?',
    options: [
      { label: 'No significant industry adoption', score: 0 },
      { label: 'Early research by some competitors', score: 1 },
      { label: 'Active pilots across the industry', score: 2 },
      { label: 'Competitors deploying quantum solutions', score: 3 },
    ],
  },
];

function getReadinessLevel(score: number): { label: string; color: string; description: string; recommendations: string[] } {
  const maxScore = questions.length * 3;
  const percentage = (score / maxScore) * 100;

  if (percentage <= 20) {
    return {
      label: 'Exploring',
      color: 'text-gray-700 bg-gray-100',
      description: 'Your organization is in the early stages of quantum awareness. Focus on education and understanding where quantum computing might apply to your business.',
      recommendations: [
        'Start with our Learning Path to build foundational knowledge',
        'Identify 2-3 business problems that could benefit from quantum computing',
        'Attend quantum computing workshops or webinars',
      ],
    };
  }
  if (percentage <= 46) {
    return {
      label: 'Emerging',
      color: 'text-blue-700 bg-blue-100',
      description: 'Your organization has some foundation for quantum adoption. Consider building a small team to explore proof-of-concept projects.',
      recommendations: [
        'Browse pre-production use cases relevant to your industry',
        'Evaluate cloud quantum computing platforms (IBM, AWS, Google)',
        'Allocate a pilot budget for quantum experimentation',
      ],
    };
  }
  if (percentage <= 73) {
    return {
      label: 'Developing',
      color: 'text-yellow-700 bg-yellow-100',
      description: 'Your organization is well-positioned to begin active quantum computing initiatives. Focus on pilot projects and building partnerships.',
      recommendations: [
        'Launch a proof-of-concept project with a cloud quantum provider',
        'Use the Priority Matrix to identify highest-impact use cases',
        'Build partnerships with quantum computing companies',
      ],
    };
  }
  return {
    label: 'Advanced',
    color: 'text-green-700 bg-green-100',
    description: 'Your organization is a quantum computing leader. Focus on production deployments and maintaining competitive advantage.',
    recommendations: [
      'Move highest-priority use cases from pilot to production',
      'Compare use cases to find the next strategic investment',
      'Contribute to quantum computing standards and research',
    ],
  };
}

export default function Assessment() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0);
  const readiness = getReadinessLevel(totalScore);

  const handleViewResults = () => {
    setShowResults(true);
  };

  if (showResults) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Readiness Assessment</h1>

        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Readiness Score</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-gray-900">
              {totalScore}/{questions.length * 3}
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${readiness.color}`}>
              {readiness.label}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${(totalScore / (questions.length * 3)) * 100}%` }}
            />
          </div>
          <p className="text-gray-700">{readiness.description}</p>
        </Card>

        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommended Next Steps</h2>
          <ul className="space-y-3">
            {readiness.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setShowResults(false);
              setAnswers({});
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Retake Assessment
          </button>
          <Link
            to="/priority-matrix"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Priority Matrix
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Readiness Assessment</h1>
      <p className="text-gray-600 mb-8">
        Evaluate your organization&apos;s readiness for quantum computing adoption.
        Answer the questions below to get a personalized readiness score and recommendations.
      </p>

      <div className="space-y-6">
        {questions.map((question, qIndex) => (
          <Card key={question.id}>
            <h2 className="font-semibold text-gray-900 mb-4">
              {qIndex + 1}. {question.text}
            </h2>
            <div className="space-y-2">
              {question.options.map((option) => (
                <label key={option.score} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    value={option.score}
                    checked={answers[question.id] === option.score}
                    onChange={() => handleAnswer(question.id, option.score)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleViewResults}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          View Results
        </button>
      </div>
    </div>
  );
}
