'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

const schema = z
  .object({
    email: z.string().email('Invalid email'),
    username: z
      .string()
      .min(3, 'Minimum 3 characters')
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
    password: z.string().min(1, 'Password is required'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ email, username, password }: Omit<FormData, 'confirmPassword'>) =>
      authService.register({ email, username, password }),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error?.message;
      const text = Array.isArray(msg) ? msg[0] : String(msg ?? 'Something went wrong');
      if (text.toLowerCase().includes('email')) {
        setError('email', { message: text });
      } else if (text.toLowerCase().includes('username')) {
        setError('username', { message: text });
      } else if (text.toLowerCase().includes('password')) {
        setError('password', { message: text });
      } else {
        setError('email', { message: text });
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-md px-8 py-10 bg-card rounded-2xl shadow-2xl border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🎁
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-1 text-sm">Start your reward journey</p>
        </div>

        <form onSubmit={handleSubmit(({ confirmPassword: _, ...d }) => mutate(d))} className="space-y-4">
          {[
            { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { name: 'username', label: 'Username', type: 'text', placeholder: 'johndoe' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
              <input
                {...register(name as keyof FormData)}
                type={type}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
              {errors[name as keyof FormData] && (
                <p className="text-destructive text-xs mt-1">
                  {errors[name as keyof FormData]?.message}
                </p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition mt-2"
          >
            {isPending ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
