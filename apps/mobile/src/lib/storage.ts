import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveRoute, Session } from '../types';

const SESSION_KEY = '@localtrak/session';
const ACTIVE_ROUTE_KEY = '@localtrak/active-route';
const THEME_KEY = '@localtrak/theme';

export async function saveSession(session: Session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function clearSession() {
  await Promise.all([AsyncStorage.removeItem(SESSION_KEY), AsyncStorage.removeItem(ACTIVE_ROUTE_KEY)]);
}

export async function saveActiveRoute(route: ActiveRoute) {
  await AsyncStorage.setItem(ACTIVE_ROUTE_KEY, JSON.stringify(route));
}

export async function getActiveRoute() {
  const raw = await AsyncStorage.getItem(ACTIVE_ROUTE_KEY);
  return raw ? (JSON.parse(raw) as ActiveRoute) : null;
}

export async function clearActiveRoute() {
  await AsyncStorage.removeItem(ACTIVE_ROUTE_KEY);
}

export async function saveTheme(theme: 'light' | 'dark') {
  await AsyncStorage.setItem(THEME_KEY, theme);
}

export async function getTheme() {
  const raw = await AsyncStorage.getItem(THEME_KEY);
  return raw === 'dark' ? 'dark' : 'light';
}
