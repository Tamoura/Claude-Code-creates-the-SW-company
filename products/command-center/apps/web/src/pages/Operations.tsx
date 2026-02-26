import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

interface OperationsSection {
  id: string;
  title: string;
  icon: string;
  content: string;
}

interface OperationsResponse {
  sections: OperationsSection[];
}

export default function Operations() {
  const { data, loading } = useApi<OperationsResponse>('/operations');
  const [activeSection, setActiveSection] = useState<string>('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!data?.sections || data.sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -50% 0px' }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [data]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load operations guide</p>;

  const { sections } = data;

  const handleNavClick = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Operations Guide</h1>
      <p className="text-slate-500 mb-8">How to operate and manage ConnectSW</p>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <nav className="hidden lg:block w-64 flex-shrink-0 sticky top-8 self-start">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 px-3">Contents</h3>
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => handleNavClick(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      activeSection === section.id
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="text-sm">{section.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                {section.title}
              </h2>
              <div className="prose-compact">
                <MarkdownRenderer content={section.content} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-72 mb-8" />
      <div className="flex gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="h-96 bg-slate-800 rounded-xl" />
        </div>
        <div className="flex-1 space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
