import { SignIn } from '@clerk/remix';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bolt-elements-background-depth-1">
      <SignIn />
    </div>
  );
}
