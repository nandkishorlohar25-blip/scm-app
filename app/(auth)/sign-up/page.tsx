import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-2xl backdrop-blur-xl">
        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "#0f172a",
              colorText: "#f8fafc",
              colorInputBackground: "#1e293b",
              colorInputText: "#f8fafc",
            },
          }}
        />
      </div>
    </div>
  );
}
