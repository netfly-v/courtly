import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export const PasswordInput = (props: Omit<ComponentProps<'input'>, 'type'>) => {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOffIcon : EyeIcon;

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className="pr-9 [&::-ms-reveal]:hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1/2 right-1 -translate-y-1/2"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible(!visible)}
      >
        <Icon aria-hidden className="size-4" />
      </Button>
    </div>
  );
};
