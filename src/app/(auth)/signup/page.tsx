
import { SignupForm } from '@/components/forms/signup-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="items-center text-center">
        <Image 
          src="https://placehold.co/100x100.png" 
          alt="City Seal" 
          width={80} 
          height={80} 
          className="mb-4 rounded-full"
          data-ai-hint="city seal logo"
        />
        <CardTitle className="text-2xl font-headline text-primary">CITY HEALTH OFFICE 1</CardTitle>
        <CardDescription>Create your account to get started.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SignupForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
