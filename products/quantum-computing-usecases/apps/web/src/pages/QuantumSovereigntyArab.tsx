import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import References, { Reference } from '../components/references/References';
import Citation from '../components/references/Citation';

export default function QuantumSovereigntyArab() {
  const { t } = useTranslation();

  // References based on fact-checking research conducted on 2026-01-27
  const references: Reference[] = [
    {
      id: 1,
      title: "What Is Post-Quantum Cryptography?",
      source: "National Institute of Standards and Technology (NIST)",
      url: "https://www.nist.gov/cybersecurity/what-post-quantum-cryptography",
      accessDate: "2026-01-27"
    },
    {
      id: 2,
      title: "How Quantum Computing Will Upend Cybersecurity",
      source: "Boston Consulting Group (BCG)",
      date: "2025",
      url: "https://www.bcg.com/publications/2025/how-quantum-computing-will-upend-cybersecurity",
      accessDate: "2026-01-27"
    },
    {
      id: 3,
      title: "Quantum computing in the UAE",
      source: "The Official Platform of the UAE Government",
      url: "https://u.ae/en/about-the-uae/science-and-technology/quantum-computing-in-the-uae",
      accessDate: "2026-01-27"
    },
    {
      id: 4,
      title: "Quantum Research Center",
      source: "Technology Innovation Institute (TII)",
      url: "https://www.tii.ae/quantum",
      accessDate: "2026-01-27"
    },
    {
      id: 5,
      title: "TII to Build UAE's First Quantum Computer",
      source: "Technology Innovation Institute",
      url: "https://www.tii.ae/news/tii-build-uaes-first-quantum-computer",
      accessDate: "2026-01-27"
    },
    {
      id: 6,
      title: "Saudi Arabia Lays Out Its Strategic Vision For The Quantum Era",
      source: "The Quantum Insider",
      date: "January 6, 2025",
      url: "https://thequantuminsider.com/2025/01/06/saudi-arabia-lays-out-its-strategic-vision-for-the-quantum-era/",
      accessDate: "2026-01-27"
    },
    {
      id: 7,
      title: "How Saudi Arabia is moving towards a quantum economy",
      source: "World Economic Forum",
      date: "January 2025",
      url: "https://www.weforum.org/stories/2025/01/how-saudi-arabia-is-moving-towards-a-quantum-economy/",
      accessDate: "2026-01-27"
    },
    {
      id: 8,
      title: "KAUST to Pioneer Quantum Computing in the Middle East",
      source: "KAUST Innovation",
      url: "https://innovation.kaust.edu.sa/kaust-pioneering-new-quantum-computing-modeling/",
      accessDate: "2026-01-27"
    },
    {
      id: 9,
      title: "Quantum Computing Reading Group at KAUST",
      source: "King Abdullah University of Science and Technology",
      url: "https://qcrg.kaust.edu.sa/",
      accessDate: "2026-01-27"
    },
    {
      id: 10,
      title: "Quantum Computing Research in the Arab World",
      source: "Communications of the ACM",
      url: "https://cacm.acm.org/arab-world-regional-special-section/quantum-computing-research-in-the-arab-world/",
      accessDate: "2026-01-27"
    },
    {
      id: 11,
      title: "Enhancing Performance of Continuous-Variable Quantum Key Distribution (CV-QKD)",
      source: "MDPI Sensors, National Institute of Laser Enhanced Sciences, Cairo University",
      date: "August 2024",
      url: "https://www.mdpi.com/1424-8220/24/16/5201",
      accessDate: "2026-01-27"
    },
    {
      id: 12,
      title: "QEgypt - Quantum Computing in Egypt",
      source: "QWorld",
      url: "https://qworld.net/qegypt/",
      accessDate: "2026-01-27"
    },
    {
      id: 13,
      title: "Qatar Center for Quantum Computing (QC2)",
      source: "Hamad Bin Khalifa University (HBKU)",
      url: "https://www.hbku.edu.qa/en/cse/qc2",
      accessDate: "2026-01-27"
    },
    {
      id: 14,
      title: "Invest Qatar partners with Quantinuum to accelerate expansion",
      source: "Quantinuum",
      url: "https://www.quantinuum.com/press-releases/invest-qatar-partners-with-quantinuum-to-accelerate-expansion-and-advance-the-regions-quantum-computing-ecosystem",
      accessDate: "2026-01-27"
    },
    {
      id: 15,
      title: "Quantum.Tech Qatar 2026",
      source: "Alpha Events",
      url: "https://www.alphaevents.com/events-quantumtechqatar/about-us",
      accessDate: "2026-01-27"
    },
    {
      id: 16,
      title: "THE LINE: a revolution in urban living",
      source: "NEOM Official",
      url: "https://www.neom.com/en-us/regions/theline",
      accessDate: "2026-01-27"
    },
    {
      id: 17,
      title: "Quantum Technologies and Quantum Computing in the Middle East",
      source: "Post Quantum",
      url: "https://postquantum.com/quantum-computing/quantum-middle-east/",
      accessDate: "2026-01-27"
    },
    {
      id: 18,
      title: "Chevron invests in quantum computing development for oil and gas market",
      source: "World Oil",
      date: "March 5, 2024",
      url: "https://worldoil.com/news/2024/3/5/chevron-invests-in-quantum-computing-development-for-oil-and-gas-market",
      accessDate: "2026-01-27"
    },
    {
      id: 19,
      title: "Quantum Computing: The Next Big Thing for Oil Exploration?",
      source: "TGS",
      url: "https://www.tgs.com/technical-library/quantum-computing-the-next-big-thing-for-oil-exploration",
      accessDate: "2026-01-27"
    },
    {
      id: 20,
      title: "Quantum Computing, Technology of the Future",
      source: "Egypt Oil & Gas",
      url: "https://egyptoil-gas.com/features/quantum-commuting-technology-of-the-future/",
      accessDate: "2026-01-27"
    },
    {
      id: 21,
      title: "Quantum Computing and Islamic Finance: Pioneering Ethical Innovation",
      source: "MSN Technology",
      url: "https://msntechnology.com/quantum-computing-and-islamic-finance-pioneering-ethical-innovation/amp/",
      accessDate: "2026-01-27"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('sovereignty.title')}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {t('sovereignty.subtitle')}
        </p>
      </div>

      {/* Section 1: Overview - Why Quantum Sovereignty Matters */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {t('sovereignty.overview.title')}
        </h2>
        <Card>
          <div className="prose max-w-none">
            <p className="text-gray-700 mb-4">
              {t('sovereignty.overview.definition')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {t('sovereignty.overview.nationalSecurity.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.overview.nationalSecurity.description')}<Citation refId={[1, 2]} />
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  {t('sovereignty.overview.economicImpact.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.overview.economicImpact.description')}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">
                  {t('sovereignty.overview.techIndependence.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.overview.techIndependence.description')}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">
                  {t('sovereignty.overview.strategicPosition.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.overview.strategicPosition.description')}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Section 2: Current State in Arab Nations */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {t('sovereignty.currentState.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  UAE
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('sovereignty.currentState.uae.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.currentState.uae.description')}<Citation refId={[3, 4, 5]} />
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-400 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  KSA
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('sovereignty.currentState.saudi.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.currentState.saudi.description')}<Citation refId={[6, 7, 8, 9]} />
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 via-white to-black rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  EG
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('sovereignty.currentState.egypt.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.currentState.egypt.description')}<Citation refId={[10, 11, 12]} />
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-maroon-800 to-white rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  QA
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('sovereignty.currentState.qatar.title')}
                </h3>
                <p className="text-gray-700">
                  {t('sovereignty.currentState.qatar.description')}<Citation refId={[13, 14, 15]} />
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {t('sovereignty.currentState.regional.title')}
          </h3>
          <p className="text-gray-700">
            {t('sovereignty.currentState.regional.description')}
          </p>
        </Card>
      </section>

      {/* Section 3: Key Investment Areas */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {t('sovereignty.investments.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('sovereignty.investments.infrastructure.title')}
              </h3>
              <p className="text-gray-600">
                {t('sovereignty.investments.infrastructure.description')}
              </p>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('sovereignty.investments.cryptography.title')}
              </h3>
              <p className="text-gray-600">
                {t('sovereignty.investments.cryptography.description')}
              </p>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('sovereignty.investments.sensors.title')}
              </h3>
              <p className="text-gray-600">
                {t('sovereignty.investments.sensors.description')}
              </p>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('sovereignty.investments.education.title')}
              </h3>
              <p className="text-gray-600">
                {t('sovereignty.investments.education.description')}
              </p>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('sovereignty.investments.researchHubs.title')}
              </h3>
              <p className="text-gray-600">
                {t('sovereignty.investments.researchHubs.description')}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 4: Strategic Use Cases */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {t('sovereignty.useCases.title')}
        </h2>
        <div className="space-y-4">
          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('sovereignty.useCases.oilGas.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.useCases.oilGas.description')}<Citation refId={[17, 18, 19, 20]} />
            </p>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('sovereignty.useCases.finance.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.useCases.finance.description')}<Citation refId={21} />
            </p>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('sovereignty.useCases.smartCities.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.useCases.smartCities.description')}<Citation refId={[16, 17]} />
            </p>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('sovereignty.useCases.climate.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.useCases.climate.description')}
            </p>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('sovereignty.useCases.supplyChain.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.useCases.supplyChain.description')}
            </p>
          </Card>
        </div>
      </section>

      {/* Section 5: Challenges & Opportunities */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {t('sovereignty.challenges.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-red-50 border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('sovereignty.challenges.techAccess.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.challenges.techAccess.description')}
            </p>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('sovereignty.challenges.techAccessOpp.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.challenges.techAccessOpp.description')}
            </p>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('sovereignty.challenges.talentDev.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.challenges.talentDev.description')}
            </p>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('sovereignty.challenges.talentDevOpp.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.challenges.talentDevOpp.description')}
            </p>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('sovereignty.challenges.regionalCollab.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.challenges.regionalCollab.description')}
            </p>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('sovereignty.challenges.regionalCollabOpp.title')}
            </h3>
            <p className="text-gray-700">
              {t('sovereignty.challenges.regionalCollabOpp.description')}
            </p>
          </Card>
        </div>
      </section>

      {/* Section 6: Roadmap */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {t('sovereignty.roadmap.title')}
        </h2>
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  1-3Y
                </div>
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-semibold text-blue-900 mb-3">
                  {t('sovereignty.roadmap.nearTerm.title')}
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.nearTerm.point1')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.nearTerm.point2')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.nearTerm.point3')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.nearTerm.point4')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  3-5Y
                </div>
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-semibold text-purple-900 mb-3">
                  {t('sovereignty.roadmap.mediumTerm.title')}
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.mediumTerm.point1')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.mediumTerm.point2')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.mediumTerm.point3')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.mediumTerm.point4')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  5-10Y
                </div>
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-semibold text-green-900 mb-3">
                  {t('sovereignty.roadmap.longTerm.title')}
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.longTerm.point1')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.longTerm.point2')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.longTerm.point3')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{t('sovereignty.roadmap.longTerm.point4')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold mb-4">
            {t('sovereignty.cta.title')}
          </h2>
          <p className="text-xl mb-6 text-blue-100">
            {t('sovereignty.cta.description')}
          </p>
        </div>
      </Card>

      {/* References Section */}
      <References references={references} />
    </div>
  );
}
