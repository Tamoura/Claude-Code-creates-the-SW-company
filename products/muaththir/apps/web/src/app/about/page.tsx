import Link from 'next/link';
import Header from '../../components/layout/Header';
import { DIMENSIONS } from '../../lib/dimensions';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
            About Mu&apos;aththir
          </h1>

          <div className="prose prose-slate max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                The Meaning
              </h2>
              <p className="text-slate-600 leading-relaxed">
                &quot;Mu&apos;aththir&quot; is an Arabic word meaning
                &quot;influential&quot; or &quot;impactful.&quot; We believe
                that intentional, holistic parenting creates children who grow
                into adults of genuine impact. The platform embodies this belief
                by helping parents see the full picture of their child&apos;s
                development.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                The Six Dimensions
              </h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Every child is more than a grade or a report card. Mu&apos;aththir
                tracks six interconnected dimensions of development:
              </p>
              <div className="space-y-4">
                {DIMENSIONS.map((dim) => (
                  <div
                    key={dim.slug}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-50"
                  >
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: dim.colour }}
                      aria-hidden="true"
                    />
                    <div>
                      <h3
                        className="font-semibold text-slate-900"
                        style={{ color: dim.colour }}
                      >
                        {dim.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {dim.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                The Philosophy
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                The six dimensions are not isolated silos. They are
                interconnected and mutually reinforcing:
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    Ihsan
                  </span>
                  <span>(excellence in everything) connects academic goals to Islamic values</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    Sabr
                  </span>
                  <span>(patience) connects behavioural self-regulation to Islamic character</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    Shukr
                  </span>
                  <span>(gratitude) connects social-emotional awareness to Islamic practice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    Tawakkul
                  </span>
                  <span>(reliance on Allah while taking action) connects aspirational goals to Islamic faith</span>
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Who It&apos;s For
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Mu&apos;aththir is designed primarily for Muslim parents with
                children ages 3 to 16, but five of the six dimensions are
                universal. Any parent who wants a holistic, structured approach
                to child development will find value in this platform.
              </p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup" className="btn-primary">
              Start Tracking Free
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
