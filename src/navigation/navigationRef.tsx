import { createNavigationContainerRef } from '@react-navigation/native';

type RootStackParamList = Record<string, object | undefined>;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: string, params?: object) {
  if (!navigationRef.isReady()) return;

  if (params === undefined) {
    navigationRef.navigate(name);
  } else {
    navigationRef.navigate(name, params);
  }
}
