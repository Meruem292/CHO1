import { LoginForm } from '@/components/forms/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/app-logo';
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-primary">
            <AppLogo className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl font-headline">{APP_NAME}</CardTitle>
          <CardDescription>Please select your role to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
