
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type * as z from 'zod';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth-hook';
import { loginSchema } from '@/zod-schemas';
import { GoogleLogo } from '@/components/icons/google-logo';
import { FacebookLogo } from '@/components/icons/facebook-logo';
import { toast } from '@/hooks/use-toast';

export function LoginForm() {
  const { loginWithEmail, loginWithGoogle, loginWithFacebook, isLoading } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '', // Can be email or username, but Firebase expects email for email/pass login
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(data: z.infer<typeof loginSchema>) {
    // The validation is handled by the auth provider, no need for manual checks here.
    await loginWithEmail(data.email, data.password);
  }

  const handleSocialLogin = async (provider: 'Google' | 'Facebook') => {
    if (provider === 'Google') {
      await loginWithGoogle();
    } else if (provider === 'Facebook') {
      await loginWithFacebook();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />
          <Link href="#" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          type="button"
          onClick={() => handleSocialLogin('Google')}
          disabled={isLoading}
        >
          <GoogleLogo className="mr-2 h-5 w-5" />
          {isLoading ? 'Processing...' : 'Sign-In via Google'}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          type="button"
          onClick={() => handleSocialLogin('Facebook')}
          disabled={isLoading}
        >
          <FacebookLogo className="mr-2 h-5 w-5" />
          {isLoading ? 'Processing...' : 'Sign-In via Facebook'}
        </Button>
      </form>
    </Form>
  );
}
