import { object, type ObjectSchema, string } from 'yup';
import type { LoginDto } from '@/shared/api/generated/model';

const invalidEmail = 'Enter a valid email, like anna@courtly.dev';

// Mirrors the API's LoginDto: keep the rules in sync.
export const loginSchema: ObjectSchema<LoginDto> = object({
  email: string()
    .required('Enter your email')
    .email(invalidEmail)
    // yup accepts "anna@courtly", but the API's IsEmail wants a top-level domain.
    .matches(/\.[^.@\s]{2,}$/, invalidEmail),
  password: string().required('Enter your password'),
});
