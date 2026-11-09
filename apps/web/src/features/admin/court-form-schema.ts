import { mixed, number, object, type ObjectSchema, ref, string } from 'yup';
import { type CreateCourtDto, Sport } from '@/shared/api/generated/model';

// The form shows the price in euros; the container sends cents.
export type CourtFormValues = Omit<CreateCourtDto, 'hourlyPriceCents'> & { hourlyPrice: string };

const invalidPrice = 'Enter a price, like 24.00';

// Mirrors the API's CreateCourtDto: keep the rules in sync.
export const courtFormSchema: ObjectSchema<CourtFormValues> = object({
  name: string().trim().required('Enter a name').max(60, 'Use at most 60 characters'),
  sport: mixed<Sport>().oneOf(Object.values(Sport), 'Choose a sport').required('Choose a sport'),
  hourlyPrice: string()
    .transform((value: string) => value.trim().replace(',', '.'))
    .required(invalidPrice)
    .matches(/^\d+(\.\d{1,2})?$/, invalidPrice)
    .test('positive', 'The price must be more than €0', value => Number(value) > 0)
    .test('max', 'The price can be at most €1,000.00', value => Number(value) <= 1000),
  openHour: number().required().min(0).max(23),
  closeHour: number().required().max(24).moreThan(ref('openHour'), 'Must be after opening'),
});
