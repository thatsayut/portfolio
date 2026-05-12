'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/services/api.client';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime } from '@/utils/format';

const profileSchema = z.object({ username: z.string().min(3).max(30), phone: z.string().optional() });
const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Needs uppercase, lowercase, number, special char'),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const qc = useQueryClient();
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get('/users/me').then((r) => r.data.data),
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { username: user?.username ?? '', phone: user?.phone ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const { mutate: updateProfile, isPending: profilePending, isSuccess: profileSuccess } = useMutation({
    mutationFn: (data: ProfileForm) => apiClient.patch('/users/me', data).then(r => r.data.data),
    onSuccess: (updated) => {
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, ...updated }, accessToken, refreshToken);
      }
    },
  });

  const { mutate: changePassword, isPending: passPending, isSuccess: passSuccess } = useMutation({
    mutationFn: (data: PasswordForm) => apiClient.put('/auth/change-password', data),
    onSuccess: () => passwordForm.reset(),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Avatar + Info */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
          {user?.username[0].toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{user?.username}</p>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{user?.role}</span>
            <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full text-xs font-medium">{user?.status}</span>
          </div>
          {user?.lastLoginAt && (
            <p className="text-xs text-muted-foreground mt-1">Last login: {formatDateTime(user.lastLoginAt)}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {profile?.stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{profile.stats.checkinCount}</p>
            <p className="text-sm text-muted-foreground">Total Check-ins</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{profile.stats.currentStreak}</p>
            <p className="text-sm text-muted-foreground">Current Streak</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{Number(profile.stats.wallet?.totalEarned ?? 0).toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">Coins Earned</p>
          </div>
        </div>
      )}

      {/* Update Profile */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Edit Profile</h2>
        <form onSubmit={profileForm.handleSubmit((d) => updateProfile(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
            <input {...profileForm.register('username')} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {profileForm.formState.errors.username && <p className="text-destructive text-xs mt-1">{profileForm.formState.errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <input {...profileForm.register('phone')} placeholder="+1234567890" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="submit" disabled={profilePending} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition">
            {profilePending ? 'Saving...' : profileSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Change Password</h2>
        <form onSubmit={passwordForm.handleSubmit((d) => changePassword(d))} className="space-y-4">
          {[
            { name: 'currentPassword', label: 'Current Password' },
            { name: 'newPassword', label: 'New Password' },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
              <input {...passwordForm.register(name as keyof PasswordForm)} type="password" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {passwordForm.formState.errors[name as keyof PasswordForm] && <p className="text-destructive text-xs mt-1">{passwordForm.formState.errors[name as keyof PasswordForm]?.message}</p>}
            </div>
          ))}
          <button type="submit" disabled={passPending} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition">
            {passPending ? 'Updating...' : passSuccess ? 'Updated!' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
