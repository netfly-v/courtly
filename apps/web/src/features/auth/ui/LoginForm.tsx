import type { UseFormReturn } from 'react-hook-form';
import type { LoginDto } from '@/shared/api/generated/model';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PasswordInput } from './PasswordInput';

interface LoginFormProps {
  form: UseFormReturn<LoginDto>;
  error?: string;
  pending: boolean;
  onSubmit: (credentials: LoginDto) => void;
}

const FieldMessage = ({ id, message }: { id: string; message?: string }) => (
  <p id={id} className="min-h-5 text-sm text-destructive">
    {message}
  </p>
);

export const LoginForm = ({ form, error, pending, onSubmit }: LoginFormProps) => {
  const { errors } = form.formState;

  return (
    <Card className="w-full max-w-sm shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          <h1>Log in to Courtly</h1>
        </CardTitle>
        <CardDescription>Use your email and password.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <PasswordInput
              id="password"
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
      </CardContent>
    </Card>
  );
};
