import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiClient } from '../../services/api.client';

export interface IdempotentButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick: (idempotencyKey: string) => Promise<unknown> | void;
  loadingText?: string;
  children: React.ReactNode;
}

export const IdempotentButton: React.FC<IdempotentButtonProps> = ({
  onClick,
  disabled,
  className = '',
  loadingText,
  children,
  type = 'button',
  ...rest
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading || disabled) return;

    // Immediately debounce click and lock button
    setIsLoading(true);
    const idempotencyKey = ApiClient.generateUuid();

    try {
      await onClick(idempotencyKey);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={`${className} ${
        isLoading ? 'opacity-70 cursor-not-allowed select-none' : ''
      } transition-all duration-200 inline-flex items-center justify-center gap-2`}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
};
