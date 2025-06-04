
import { LoginForm } from '@/components/forms/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="items-center text-center">
        <Image 
          src="/app-logo.png" 
          alt="City Seal" 
          width={80} 
          height={80} 
          className="mb-4 rounded-full"
        />
        <CardTitle className="text-2xl font-headline text-primary">CITY HEALTH OFFICE 1</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
