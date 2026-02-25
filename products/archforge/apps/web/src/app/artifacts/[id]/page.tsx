// This route is intentionally empty — artifact detail lives at
// /projects/[id]/artifacts/[artifactId]
// This file prevents Next.js from 404ing on old bookmarks.
import { redirect } from 'next/navigation';

export default function LegacyArtifactPage() {
  redirect('/dashboard');
}
