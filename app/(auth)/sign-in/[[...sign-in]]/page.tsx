import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0f0f0f]">
      <SignIn />
    </div>
  );
}
