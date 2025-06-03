
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type * as z from 'zod';

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
import { useAuth } from '@/hooks/use-auth-hook';
import { signupSchema } from '@/zod-schemas';
import { GoogleLogo } from '@/components/icons/google-logo';
import { FacebookLogo } from '@/components/icons/facebook-logo';
import { toast } from '@/hooks/use-toast';

export function SignupForm() {
  const { login } = useAuth(); // Using login for mock behavior after signup

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  function onSubmit(data: z.infer<typeof signupSchema>) {
    console.log('Signup form submitted:', data);
    // Mock: Log in the user as 'patient' after successful "signup"
    login('patient', data.fullName);
    toast({ title: "Signup Successful", description: "Your account has been created." });
  }

  const handleSocialSignup = (provider: 'Google' | 'Facebook') => {
    console.log(`Attempting to sign up with ${provider}`);
    toast({ title: `${provider} Sign-Up`, description: `Sign-up with ${provider} is not yet implemented.` });
    // Mock login with a default role
    login('patient', `${provider} User`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Juan Dela Cruz" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
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
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
          Sign Up
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
          onClick={() => handleSocialSignup('Google')}
        >
          <GoogleLogo className="mr-2 h-5 w-5" />
          Sign up with Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          type="button"
          onClick={() => handleSocialSignup('Facebook')}
        >
          <FacebookLogo className="mr-2 h-5 w-5" />
          Sign up with Facebook
        </Button>
      </form>
    </Form>
  );
}

