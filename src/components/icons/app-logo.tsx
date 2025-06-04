import Image from 'next/image';

interface AppLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function AppLogo({ className, width = 32, height = 32 }: AppLogoProps) {
  return (
    <Image
      src="/app-logo.png" // Ensure your logo file is at public/app-logo.svg (or .png, .jpg etc.)
      alt="City Health Office Logo"
      width={width}
      height={height}
      className={className}
      priority // Logos in headers are often LCP candidates
    />
  );
}
