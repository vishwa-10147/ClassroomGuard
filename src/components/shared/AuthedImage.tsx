import type { ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthedImage } from '@/hooks/useAuthedImage';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  /** API path, with or without the /api/v1 prefix (e.g. /api/v1/evidence/frames/x.jpg). */
  src: string;
};

/** `<img>` for protected API files: loads with the user's token, shows a placeholder on error. */
export function AuthedImage({ src, className, alt, ...rest }: Props) {
  const { src: objectUrl, error } = useAuthedImage(src.replace(/^\/api\/v1/, ''));
  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-cg-bg-tertiary text-cg-text-tertiary', className)}>
        <ImageOff className="h-6 w-6 opacity-50" aria-label="Image unavailable" />
      </div>
    );
  }
  if (!objectUrl) {
    return <div className={cn('animate-pulse bg-cg-bg-tertiary', className)} aria-busy="true" />;
  }
  return <img src={objectUrl} alt={alt} className={className} {...rest} />;
}
