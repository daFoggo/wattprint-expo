import { Redirect } from 'expo-router';

// A signed-out user who opens "/" (a cold start or a deep link) has no (app) route available;
// without this the router shows +not-found.
export default function AuthIndexRoute() {
  return <Redirect href="/sign-in" />;
}
