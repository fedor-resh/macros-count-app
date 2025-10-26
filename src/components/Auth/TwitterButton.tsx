import { IconBrandX } from '@tabler/icons-react';
import { Button, ButtonProps } from '@mantine/core';

export function TwitterButton(props: ButtonProps & React.ComponentPropsWithoutRef<'button'>) {
  return (
    <Button leftSection={<IconBrandX size={16} color="#00ACEE" />} variant="default" {...props} />
  );
}
