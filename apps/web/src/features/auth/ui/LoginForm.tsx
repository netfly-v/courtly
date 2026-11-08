import type { UseFormReturn } from 'react-hook-form';
import type { LoginDto } from '@/shared/api/generated/model';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

interface DemoAccount {
  name: string;
  initials: string;
  email: string;
  role: string;
}

interface LoginFormProps {
  form: UseFormReturn<LoginDto>;
  demoAccounts: DemoAccount[];
  error?: string;
  pending: boolean;
  onSubmit: (credentials: LoginDto) => void;
  onDemoLogin: (email: string) => void;
}

const FieldMessage = ({ id, message }: { id: string; message?: string }) => (
  <p id={id} className="min-h-5 text-sm text-destructive">
    {message}
  </p>
);

export const LoginForm = ({
  form,
  demoAccounts,
  error,
  pending,
  onSubmit,
  onDemoLogin,
}: LoginFormProps) => {
  const { errors } = form.formState;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>Log in to Courtly</h1>
        </CardTitle>
        <CardDescription>Book a court in a few clicks.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form
          className="flex flex-col gap-2"
          noValidate
          onSubmit={event => void form.handleSubmit(onSubmit)(event)}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="email-error"
              {...form.register('email')}
            />
            <FieldMessage id="email-error" message={errors.email?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-error"
              {...form.register('password')}
            />
            <FieldMessage id="password-error" message={errors.password?.message} />
          </div>
          <p role="alert" className="min-h-5 text-sm text-destructive">
            {error}
          </p>
          <Button type="submit" size="lg" disabled={pending}>
            Log in
          </Button>
        </form>
        <section className="flex flex-col gap-2" aria-labelledby="demo-accounts">
          <h2 id="demo-accounts" className="text-sm text-muted-foreground">
            Or log in with a demo account
          </h2>
          <ul className="flex flex-col gap-2">
            {demoAccounts.map(account => (
              <li key={account.email}>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 py-2 text-left"
                  aria-label={`Log in as ${account.name}`}
                  disabled={pending}
                  onClick={() => onDemoLogin(account.email)}
                >
                  <Avatar aria-hidden>
                    <AvatarFallback>{account.initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{account.name}</span>
                    <span className="text-xs text-muted-foreground">{account.email}</span>
                  </span>
                  <Badge variant="secondary">{account.role}</Badge>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
};
