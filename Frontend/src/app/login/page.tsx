"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GoogleIcon from "@/components/GoogleIcon";

type View = "login" | "signupSelection" | "signupCredentials";

const TITLES: Record<View, { title: string; subtitle: string }> = {
  login: { title: "Welcome Back", subtitle: "Sign in to continue your session" },
  signupSelection: {
    title: "Join the Future",
    subtitle: "Choose your preferred way to get started",
  },
  signupCredentials: {
    title: "Create Account",
    subtitle: "Enter your details to create a corporate profile",
  },
};

export default function LoginPage() {
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await signIn(email, password);
    setSubmitting(false);
    if (res.ok) {
      router.replace("/dashboard");
    } else {
      setError(res.error ?? "Something went wrong.");
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regUsername || !regEmail || !regPassword) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    const res = await signUp(regUsername, regEmail, regPassword);
    setSubmitting(false);
    if (res.ok) {
      router.replace("/dashboard");
    } else {
      setError(res.error ?? "Something went wrong.");
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    await signInWithGoogle();
    setSubmitting(false);
    router.replace("/dashboard");
  };

  const { title, subtitle } = TITLES[view];

  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-surface">
      <div className="flex-1 flex items-center justify-center p-margin-mobile lg:p-margin-desktop bg-surface overflow-y-auto">
        <div className="w-full max-w-xl transition-all duration-700 ease-out">
          <div className="flex flex-col items-center mb-10">
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
              {title}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {subtitle}
            </p>
          </div>

          {error && (
            <div className="w-full max-w-md mx-auto mb-4 px-4 py-3 rounded-lg bg-error-container text-on-error-container font-body-md text-body-md">
              {error}
            </div>
          )}

          {view === "login" && (
            <div className="w-full max-w-md mx-auto">
              <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl p-8 shadow-xl border border-white/40">
                <form className="space-y-6" onSubmit={handleSignIn}>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={submitting}
                    className="w-full py-3.5 flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all shadow-sm group disabled:opacity-60"
                  >
                    <GoogleIcon />
                    <span className="font-title-lg text-body-lg font-semibold text-on-surface">
                      Sign in with Google
                    </span>
                  </button>

                  <div className="my-5 flex items-center gap-4">
                    <div className="h-px flex-1 bg-outline-variant" />
                    <span className="font-label-md text-label-md text-outline uppercase whitespace-nowrap">
                      or sign in with email
                    </span>
                    <div className="h-px flex-1 bg-outline-variant" />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant block ml-1 uppercase tracking-wider"
                      htmlFor="email"
                    >
                      Corporate Email
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                        alternate_email
                      </span>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full pl-12 pr-4 py-3 bg-surface-container rounded-lg outline-none focus:ring-2 focus:ring-primary/20 border-b-2 border-transparent focus:border-primary transition-all font-body-md text-body-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label
                        className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider"
                        htmlFor="password"
                      >
                        Password
                      </label>
                      <a
                        className="font-label-md text-label-md text-primary hover:underline decoration-2 underline-offset-4 transition-all cursor-pointer"
                        href="#"
                      >
                        Forgot Password?
                      </a>
                    </div>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                        lock
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 bg-surface-container rounded-lg outline-none focus:ring-2 focus:ring-primary/20 border-b-2 border-transparent focus:border-primary transition-all font-body-md text-body-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-1">
                    <div className="relative flex items-center">
                      <input
                        id="remember"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-outline checked:bg-primary checked:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined absolute text-on-primary text-[14px] left-1 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                        check
                      </span>
                    </div>
                    <label
                      htmlFor="remember"
                      className="font-body-md text-body-md text-on-surface-variant cursor-pointer select-none"
                    >
                      Remember this device
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-primary text-on-primary font-title-lg text-title-lg rounded-lg shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
                  >
                    <span>{submitting ? "Signing in…" : "Sign In"}</span>
                    {!submitting && (
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-outline-variant text-center">
                  <p className="font-body-md text-on-surface-variant">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="text-primary font-semibold hover:underline decoration-2 underline-offset-4"
                      onClick={() => {
                        setError(null);
                        setView("signupSelection");
                      }}
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {view === "signupSelection" && (
            <div className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={submitting}
                  className="flex flex-col items-center justify-center p-10 bg-surface-container-lowest border border-white/40 shadow-xl rounded-xl hover:scale-[1.02] transition-all group disabled:opacity-60"
                >
                  <div className="w-16 h-16 mb-6 bg-surface-container flex items-center justify-center rounded-full">
                    <GoogleIcon className="w-8 h-8" />
                  </div>
                  <h3 className="font-headline-md text-headline-md mb-2">
                    Google Account
                  </h3>
                  <p className="font-body-md text-on-surface-variant text-center">
                    Fastest way to join with your work email.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("signupCredentials");
                  }}
                  className="flex flex-col items-center justify-center p-10 bg-surface-container-lowest border border-white/40 shadow-xl rounded-xl hover:scale-[1.02] transition-all group"
                >
                  <div className="w-16 h-16 mb-6 bg-primary/10 text-primary flex items-center justify-center rounded-full">
                    <span className="material-symbols-outlined text-4xl">
                      person_add
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md mb-2">
                    Direct Sign Up
                  </h3>
                  <p className="font-body-md text-on-surface-variant text-center">
                    Use a unique username and password.
                  </p>
                </button>
              </div>
              <div className="mt-10 text-center">
                <button
                  type="button"
                  className="font-label-md text-primary hover:underline uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                  onClick={() => setView("login")}
                >
                  <span className="material-symbols-outlined text-sm">
                    arrow_back
                  </span>{" "}
                  Back to Login
                </button>
              </div>
            </div>
          )}

          {view === "signupCredentials" && (
            <div className="w-full max-w-md mx-auto">
              <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl p-8 shadow-xl border border-white/40">
                <form className="space-y-6" onSubmit={handleSignUp}>
                  <div className="space-y-2">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant block ml-1 uppercase tracking-wider"
                      htmlFor="reg-username"
                    >
                      Username
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                        badge
                      </span>
                      <input
                        id="reg-username"
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="johndoe"
                        className="w-full pl-12 pr-4 py-3 bg-surface-container rounded-lg outline-none focus:ring-2 focus:ring-primary/20 border-b-2 border-transparent focus:border-primary transition-all font-body-md text-body-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant block ml-1 uppercase tracking-wider"
                      htmlFor="reg-email"
                    >
                      Corporate Email
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                        alternate_email
                      </span>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full pl-12 pr-4 py-3 bg-surface-container rounded-lg outline-none focus:ring-2 focus:ring-primary/20 border-b-2 border-transparent focus:border-primary transition-all font-body-md text-body-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant block ml-1 uppercase tracking-wider"
                      htmlFor="reg-password"
                    >
                      Password
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                        lock
                      </span>
                      <input
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 bg-surface-container rounded-lg outline-none focus:ring-2 focus:ring-primary/20 border-b-2 border-transparent focus:border-primary transition-all font-body-md text-body-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          {showRegPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-primary text-on-primary font-title-lg text-title-lg rounded-lg shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
                  >
                    <span>{submitting ? "Creating…" : "Create Account"}</span>
                    {!submitting && (
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                        person_add
                      </span>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-outline-variant text-center">
                  <button
                    type="button"
                    className="font-label-md text-primary hover:underline uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                    onClick={() => {
                      setError(null);
                      setView("signupSelection");
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">
                      arrow_back
                    </span>{" "}
                    Change Method
                  </button>
                </div>
              </div>
            </div>
          )}

          <footer className="mt-12 text-center">
            <p className="font-label-md text-label-md text-outline uppercase tracking-[0.2em]">
              Powered by AI Invoice Automation
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
