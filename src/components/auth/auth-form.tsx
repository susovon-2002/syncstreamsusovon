'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { CaptchaChallenge } from './captcha-challenge';
import { FirebaseError } from 'firebase/app';
import { Eye, EyeOff, Lock, Mail, User, CheckCircle2, XCircle } from 'lucide-react';

// ── Validation Schemas ──────────────────────────────────────────────────────

const nameRegex = /^[a-zA-Z][a-zA-Z\s.\-']{1,49}$/;

const signUpSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(nameRegex, 'Name must contain only letters, spaces, dots or hyphens — no numbers or symbols'),
  email: z
    .string()
    .email('Enter a valid email address')
    .refine(v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Enter a valid email with a proper domain'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(v => /[A-Z]/.test(v), 'Password must contain at least one uppercase letter')
    .refine(v => /[a-z]/.test(v), 'Password must contain at least one lowercase letter')
    .refine(v => /[0-9]/.test(v), 'Password must contain at least one number')
    .refine(v => /[@#$%^&*!_\-+=?]/.test(v), 'Password must contain at least one special character (@#$%^&*!_-)'),
});

const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Password Strength ───────────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters',        test: v => v.length >= 8 },
  { label: 'One uppercase letter (A-Z)',    test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter (a-z)',    test: v => /[a-z]/.test(v) },
  { label: 'One number (0-9)',              test: v => /[0-9]/.test(v) },
  { label: 'One special character (@#$…)', test: v => /[@#$%^&*!_\-+=?]/.test(v) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const score = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (score <= 1) return { score, label: 'Very Weak',  color: '#FF9933' };
  if (score === 2) return { score, label: 'Weak',       color: '#FF9933' };
  if (score === 3) return { score, label: 'Fair',       color: '#FFD700' };
  if (score === 4) return { score, label: 'Good',       color: '#90EE90' };
  return              { score, label: 'Strong 🎉',    color: '#138808' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = useMemo(() => getStrength(password), [password]);
  const pct = Math.round((score / 5) * 100);
  const isStrong = score === 5;

  if (!password) return null;

  return (
    <div className="space-y-2 mt-1">
      {/* Bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isStrong
              ? 'linear-gradient(90deg, #FF9933 0%, #ffffff 50%, #138808 100%)'
              : color,
            boxShadow: isStrong ? `0 0 10px ${color}88` : undefined,
            animation: isStrong ? 'tricolor-pulse 1.8s ease-in-out infinite' : undefined,
          }}
        />
      </div>

      {/* Label */}
      <p className="text-xs font-semibold transition-colors" style={{ color }}>
        {label}
      </p>

      {/* Rules checklist */}
      <ul className="space-y-0.5">
        {PASSWORD_RULES.map(rule => {
          const passed = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-[11px]">
              {passed
                ? <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[#138808]" />
                : <XCircle    className="h-3 w-3 flex-shrink-0 text-white/30" />}
              <span className={passed ? 'text-white/80' : 'text-white/30'}>{rule.label}</span>
            </li>
          );
        })}
      </ul>

      <style>{`
        @keyframes tricolor-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function AuthForm() {
  const { auth, user } = useFirebase();
  const router = useRouter();
  const [isVerified,   setIsVerified]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError,    setAuthError]    = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !user.isAnonymous) router.push('/');
  }, [user, router]);

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '' },
    mode: 'onChange',
  });

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const watchedPassword = signUpForm.watch('password');

  const getAuthErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/email-already-in-use') return 'That email is already registered. Try signing in instead.';
      if (error.code === 'auth/invalid-credential')   return 'The email or password is incorrect.';
      if (error.code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished.';
      if (error.code === 'auth/weak-password')        return 'Use a stronger password with at least 8 characters.';
      if (error.code === 'auth/user-not-found')       return 'No account found with this email.';
      if (error.code === 'auth/wrong-password')       return 'Incorrect password. Please try again.';
      if (error.code === 'auth/too-many-requests')    return 'Too many failed attempts. Please try again later.';
    }
    return 'Authentication failed. Please try again.';
  };

  async function onSignUp(values: z.infer<typeof signUpSchema>) {
    if (!isVerified) return;
    setIsSubmitting(true);
    setAuthError('');
    try {
      await initiateEmailSignUp(auth, values.email, values.password, values.displayName.trim());
      router.push('/');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSignIn(values: z.infer<typeof signInSchema>) {
    if (!isVerified) return;
    setIsSubmitting(true);
    setAuthError('');
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
      router.push('/');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm overflow-hidden rounded-lg border border-white/20 bg-white/10 text-sm shadow-[0_20px_60px_rgb(0_0_0_/_0.24)] backdrop-blur-xl">
      <Tabs defaultValue="signin">
        <CardHeader className="p-4 pb-2">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-md border border-white/10 bg-white/5 p-0">
            <TabsTrigger
              value="signin"
              className="relative h-full text-sm font-semibold data-[state=active]:bg-[#050b1b] data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-[28%] data-[state=active]:after:h-1 data-[state=active]:after:w-[44%] data-[state=active]:after:rounded-full data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-[#FF9933] data-[state=active]:after:to-[#138808]"
            >Sign In</TabsTrigger>
            <TabsTrigger
              value="signup"
              className="relative h-full text-sm font-semibold data-[state=active]:bg-[#050b1b] data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-[28%] data-[state=active]:after:h-1 data-[state=active]:after:w-[44%] data-[state=active]:after:rounded-full data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-[#FF9933] data-[state=active]:after:to-[#138808]"
            >Sign Up</TabsTrigger>
          </TabsList>
        </CardHeader>

        {/* ── Sign In Tab ── */}
        <TabsContent value="signin">
          <CardHeader className="px-4 py-3">
            <CardTitle className="tricolor-text text-2xl">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3">
            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-3">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="name@example.com" className="h-9 border-white/15 bg-white/10 pl-11 text-sm" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Your password"
                            className="h-9 border-white/15 bg-white/10 px-11 text-sm"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => setShowPassword(v => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="h-9 w-full bg-gradient-to-r from-[#FF9933] via-[#f2d890] to-[#138808] text-sm font-bold text-white shadow-[0_14px_34px_rgb(19_136_8_/_0.20)] hover:scale-[1.01]"
                  disabled={!isVerified || isSubmitting}
                >
                  {isSubmitting ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </TabsContent>

        {/* ── Sign Up Tab ── */}
        <TabsContent value="signup">
          <CardHeader className="px-4 py-3">
            <CardTitle className="tricolor-text text-2xl">Create an Account</CardTitle>
            <CardDescription>Use your real name, email and a strong password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3">
            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-3">
                {/* Name */}
                <FormField
                  control={signUpForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="e.g. Rahul Kumar" className="h-9 border-white/15 bg-white/10 pl-11 text-sm" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="name@example.com" className="h-9 border-white/15 bg-white/10 pl-11 text-sm" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min 8 chars, mixed case, number & symbol"
                            className="h-9 border-white/15 bg-white/10 px-11 text-sm"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => setShowPassword(v => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      <PasswordStrengthBar password={watchedPassword} />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="h-9 w-full bg-gradient-to-r from-[#FF9933] via-[#f2d890] to-[#138808] text-sm font-bold text-white shadow-[0_14px_34px_rgb(19_136_8_/_0.20)] hover:scale-[1.01]"
                  disabled={!isVerified || isSubmitting}
                >
                  {isSubmitting ? 'Creating account…' : 'Sign Up'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </TabsContent>

        {/* Captcha — shared across tabs */}
        <CardContent className="px-4 pb-4">
          <CaptchaChallenge onVerified={setIsVerified} />
        </CardContent>
      </Tabs>
    </Card>
  );
}
