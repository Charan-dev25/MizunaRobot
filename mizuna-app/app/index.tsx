import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Send the root route to the tabs group
  return <Redirect href="/(tabs)" />;
}