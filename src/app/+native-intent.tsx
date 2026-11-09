import { redirectAuthReturn } from '@/lib/auth-redirect';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return redirectAuthReturn(path);
}
