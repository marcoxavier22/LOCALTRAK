import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError, apiFetch, toJsonBody } from './lib/api';
import { API_URL } from './lib/config';
import {
  clearActiveRoute,
  clearSession,
  getActiveRoute,
  getSession,
  getTheme,
  saveActiveRoute,
  saveSession,
  saveTheme,
} from './lib/storage';
import { ActiveRoute, AuthResponse, RoutePointPayload, RouteSummary, ServiceOrder, Session } from './types';

type Screen = 'home' | 'history' | 'orders';
type Theme = 'light' | 'dark';

const BACKGROUND_LOCATION_TASK = 'LOCALTRAK_ROUTE_BACKGROUND_LOCATION';
const logo = require('../assets/localtrak-logo.png');
const NativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const NativeMapView = NativeMaps?.default;
const NativeMarker = NativeMaps?.Marker;
const NativePolyline = NativeMaps?.Polyline;

const themePalette = {
  light: {
    background: '#f5f7fb',
    card: '#ffffff',
    text: '#0b1f3f',
    muted: '#5c6675',
    border: '#dce3ee',
    input: '#f8fafc',
    accent: '#ff7a1a',
  },
  dark: {
    background: '#081426',
    card: '#0f2036',
    text: '#edf5ff',
    muted: '#9fb1c7',
    border: '#28425f',
    input: '#132a45',
    accent: '#ff8a34',
  },
};

type ThemeColors = (typeof themePalette)['light'];

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em rota',
  FINISHED: 'Finalizada',
  SYNC_PENDING: 'Sincronizacao pendente',
  ERROR: 'Erro',
};

const orderStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizada',
  CANCELED: 'Cancelada',
};

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

function formatKm(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  return `${numeric.toFixed(2)} km`;
}

function toActiveRoute(route: RouteSummary): ActiveRoute {
  return {
    id: route.id,
    startedAt: route.startedAt ?? new Date().toISOString(),
    serviceOrderId: route.serviceOrder?.id ?? null,
    serviceOrderTitle: route.serviceOrder?.title ?? null,
  };
}

function buildPoint(location: Location.LocationObject): RoutePointPayload {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    altitude: location.coords.altitude,
    recordedAt: new Date(location.timestamp).toISOString(),
  };
}

async function sendPoint(token: string, routeId: string, point: RoutePointPayload) {
  await apiFetch<{ received: number }>(`/routes/${routeId}/points`, {
    method: 'POST',
    token,
    body: toJsonBody({ points: [point] }),
  });
}

async function trySendPoint(token: string, routeId: string, point: RoutePointPayload | null) {
  if (!point) {
    return;
  }

  await sendPoint(token, routeId, point).catch(() => undefined);
}

async function getCurrentPointWithTimeout(timeoutMs = 10000) {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return null;
  }

  const location = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);

  return location ? buildPoint(location) : null;
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (locations.length === 0) {
    return;
  }

  const [session, activeRoute] = await Promise.all([getSession(), getActiveRoute()]);
  if (!session?.accessToken || !activeRoute?.id) {
    return;
  }

  await Promise.allSettled(
    locations.map((location) => sendPoint(session.accessToken, activeRoute.id, buildPoint(location))),
  );
});

async function startBackgroundTrackingIfAvailable() {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }

  const foregroundPermission = await Location.getForegroundPermissionsAsync();
  if (foregroundPermission.status !== Location.PermissionStatus.GRANTED) {
    return 'foreground_denied';
  }

  const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== Location.PermissionStatus.GRANTED) {
    return 'background_denied';
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 50,
      timeInterval: 30000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'LocalTrak Rotas em andamento',
        notificationBody: 'Sua localizacao esta sendo registrada somente durante o turno ativo.',
      },
    });
  }

  return 'started';
}

async function stopBackgroundTrackingIfRunning() {
  if (Platform.OS === 'web') {
    return;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [lastSummary, setLastSummary] = useState<RouteSummary | null>(null);
  const [lastLocation, setLastLocation] = useState<RoutePointPayload | null>(null);
  const [pointsSent, setPointsSent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [history, setHistory] = useState<RouteSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderKmInputs, setOrderKmInputs] = useState<Record<string, { start: string; finish: string }>>({});
  const [orderBusyId, setOrderBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    async function loadStoredData() {
      try {
        const [storedSession, storedRoute, storedTheme] = await Promise.all([
          getSession(),
          getActiveRoute(),
          getTheme(),
        ]);
        setSession(storedSession);
        setActiveRoute(storedRoute);
        setTheme(storedTheme);
      } catch (loadError) {
        setError(toMessage(loadError));
      } finally {
        setReady(true);
      }
    }

    void loadStoredData();
  }, []);

  useEffect(() => {
    if (!activeRoute) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(activeRoute.startedAt).getTime()) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeRoute]);

  useEffect(() => {
    if (!session?.accessToken || !activeRoute?.id) {
      return;
    }

    const token = session.accessToken;
    const routeId = activeRoute.id;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function startForegroundTracking() {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError('Permissao de localizacao nao concedida.');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000,
          distanceInterval: 25,
        },
        (location) => {
          if (cancelled) {
            return;
          }

          const point = buildPoint(location);
          setLastLocation(point);

          void sendPoint(token, routeId, point)
            .then(() => setPointsSent((current) => current + 1))
            .catch((trackingError) => setError(toMessage(trackingError)));
        },
      );
    }

    void startForegroundTracking().catch((trackingError) => setError(toMessage(trackingError)));
    void startBackgroundTrackingIfAvailable().catch((trackingError) => setError(toMessage(trackingError)));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [activeRoute?.id, session?.accessToken]);

  const loadHistory = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    setHistoryLoading(true);
    setError(null);

    try {
      const routes = await apiFetch<RouteSummary[]>('/routes/my-history', {
        token: session.accessToken,
      });
      setHistory(routes);
    } catch (historyError) {
      setError(toMessage(historyError));
    } finally {
      setHistoryLoading(false);
    }
  }, [session?.accessToken]);

  const loadOrders = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    setOrdersLoading(true);
    setError(null);

    try {
      const nextOrders = await apiFetch<ServiceOrder[]>('/orders/my-today', {
        token: session.accessToken,
      });
      setOrders(nextOrders);
    } catch (ordersError) {
      setError(toMessage(ordersError));
    } finally {
      setOrdersLoading(false);
    }
  }, [session?.accessToken]);

  const syncActiveRouteFromServer = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride ?? session?.accessToken;
      if (!token) {
        return null;
      }

      const route = await apiFetch<RouteSummary | null>('/routes/active', { token });

      if (route?.id && route.status === 'IN_PROGRESS') {
        const nextActiveRoute = toActiveRoute(route);
        await saveActiveRoute(nextActiveRoute);
        setActiveRoute(nextActiveRoute);
        setLastSummary(null);
        return nextActiveRoute;
      }

      await clearActiveRoute();
      setActiveRoute(null);
      return null;
    },
    [session?.accessToken],
  );

  useEffect(() => {
    if (session?.accessToken) {
      void loadHistory();
      void loadOrders();
      void syncActiveRouteFromServer().catch((syncError) => setError(toMessage(syncError)));
    }
  }, [loadHistory, loadOrders, session?.accessToken, syncActiveRouteFromServer]);

  const routeStatus = useMemo(() => {
    if (activeRoute) {
      return 'Em rota';
    }

    if (lastSummary) {
      return 'Rota finalizada';
    }

    return 'Fora de rota';
  }, [activeRoute, lastSummary]);
  const colors = themePalette[theme];

  async function handleToggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    await saveTheme(nextTheme);
  }

  async function handleLogin(email: string, password: string) {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: toJsonBody({ email, password }),
      });

      if (response.user.role !== 'EMPLOYEE') {
        setError('Este acesso é exclusivo para funcionários.');
        return;
      }

      const nextSession: Session = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      };

      await saveSession(nextSession);
      setSession(nextSession);
      setScreen('home');
    } catch (loginError) {
      setError(toMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await stopBackgroundTrackingIfRunning().catch(() => undefined);
    await clearSession();
    setSession(null);
    setActiveRoute(null);
    setLastSummary(null);
    setHistory([]);
    setPointsSent(0);
    setLastLocation(null);
  }

  async function handleStartShift() {
    if (!session?.accessToken) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const existingRoute = await syncActiveRouteFromServer(session.accessToken);
      if (existingRoute) {
        setScreen(existingRoute.serviceOrderId ? 'orders' : 'home');
        setError(
          existingRoute.serviceOrderId
            ? 'Voce ja tem uma rota de OS em andamento. Abra a aba OS para finalizar a jornada corretamente.'
            : 'Voce ja tem uma rota em andamento. Recuperamos o turno ativo neste aparelho.',
        );
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError('Permissao de localizacao negada.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = buildPoint(location);

      const route = await apiFetch<RouteSummary>('/routes/start', {
        method: 'POST',
        token: session.accessToken,
        body: toJsonBody({
          latitude: point.latitude,
          longitude: point.longitude,
        }),
      });

      const nextActiveRoute = {
        id: route.id,
        startedAt: route.startedAt ?? new Date().toISOString(),
      };

      await saveActiveRoute(nextActiveRoute);
      await sendPoint(session.accessToken, route.id, point);
      const backgroundStatus = await startBackgroundTrackingIfAvailable();

      setActiveRoute(nextActiveRoute);
      setLastSummary(null);
      setLastLocation(point);
      setPointsSent(1);
      setScreen('home');

      if (backgroundStatus === 'background_denied') {
        setError('Rota iniciada. Para rastrear em segundo plano, libere a permissao "Sempre" nas configuracoes do aparelho.');
      }
    } catch (startError) {
      if (startError instanceof ApiError && startError.status === 409) {
        const existingRoute = await syncActiveRouteFromServer(session.accessToken).catch(() => null);
        if (existingRoute) {
          setScreen(existingRoute.serviceOrderId ? 'orders' : 'home');
          setError(
            existingRoute.serviceOrderId
              ? 'Ja existe uma rota de OS em andamento. Abra a aba OS para finalizar a jornada.'
              : 'Ja existia uma rota em andamento no servidor. Recuperamos esse turno ativo.',
          );
          return;
        }
      }
      setError(toMessage(startError));
    } finally {
      setBusy(false);
    }
  }

  async function handleFinishShift() {
    if (!session?.accessToken || !activeRoute) {
      return;
    }

    if (activeRoute.serviceOrderId) {
      setScreen('orders');
      setError('Esta rota pertence a uma OS. Finalize pela aba OS para enviar foto final do odometro e KM final.');
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window === 'undefined'
          ? true
          : window.confirm('Deseja finalizar a rota em andamento?');

      if (confirmed) {
        void finishShift();
      }

      return;
    }

    Alert.alert('Finalizar turno', 'Deseja finalizar a rota em andamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: () => {
          void finishShift();
        },
      },
    ]);
  }

  async function finishShift() {
    if (!session?.accessToken || !activeRoute) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const point = (await getCurrentPointWithTimeout()) ?? lastLocation;
      await trySendPoint(session.accessToken, activeRoute.id, point);

      const summary = await apiFetch<RouteSummary>(`/routes/${activeRoute.id}/finish`, {
        method: 'POST',
        token: session.accessToken,
        body: toJsonBody({
          latitude: point?.latitude,
          longitude: point?.longitude,
        }),
      });

      await stopBackgroundTrackingIfRunning().catch(() => undefined);
      await clearActiveRoute();
      setActiveRoute(null);
      setLastSummary(summary);
      setLastLocation(point);
      setPointsSent(0);
      await loadHistory();
    } catch (finishError) {
      setError(toMessage(finishError));
    } finally {
      setBusy(false);
    }
  }

  function updateOrderKm(orderId: string, key: 'start' | 'finish', value: string) {
    setOrderKmInputs((current) => ({
      ...current,
      [orderId]: {
        start: current[orderId]?.start ?? '',
        finish: current[orderId]?.finish ?? '',
        [key]: value,
      },
    }));
  }

  async function captureOdometerPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Permissao de camera negada. A foto do odometro e obrigatoria.');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      base64: true,
      quality: 0.55,
    });

    if (result.canceled || !result.assets[0]?.base64) {
      throw new Error('Foto do odometro nao capturada.');
    }

    const asset = result.assets[0];
    return {
      photoBase64: asset.base64,
      photoContentType: asset.mimeType ?? 'image/jpeg',
    };
  }

  async function handleStartOrder(order: ServiceOrder) {
    if (!session?.accessToken) {
      return;
    }

    const odometerKm = Number(orderKmInputs[order.id]?.start || order.initialOdometerKm);
    if (!Number.isFinite(odometerKm) || odometerKm < 0) {
      setError('Informe o KM inicial antes de iniciar a OS.');
      return;
    }

    if (!order.initialOdometerPhotoPath) {
      setError('Envie a foto do odometro inicial antes de iniciar a OS.');
      return;
    }

    setOrderBusyId(order.id);
    setError(null);

    try {
      const existingRoute = await syncActiveRouteFromServer(session.accessToken);
      if (existingRoute && existingRoute.id !== order.routeShiftId) {
        setScreen(existingRoute.serviceOrderId ? 'orders' : 'home');
        setError(
          existingRoute.serviceOrderId
            ? 'Ja existe uma OS em andamento. Finalize a jornada atual antes de iniciar outra.'
            : 'Ja existe um turno em andamento. Finalize o turno atual antes de iniciar uma OS.',
        );
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError('Permissao de localizacao negada.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = buildPoint(location);

      const startedOrder = await apiFetch<ServiceOrder>(`/orders/${order.id}/start`, {
        method: 'PATCH',
        token: session.accessToken,
        body: toJsonBody({
          odometerKm,
          latitude: point.latitude,
          longitude: point.longitude,
        }),
      });

      if (startedOrder.routeShiftId) {
        const nextActiveRoute = {
          id: startedOrder.routeShiftId,
          startedAt: startedOrder.startedAt ?? new Date().toISOString(),
        };
        await saveActiveRoute(nextActiveRoute);
        await sendPoint(session.accessToken, startedOrder.routeShiftId, point).catch(() => undefined);
        setActiveRoute(nextActiveRoute);
        setLastLocation(point);
        setPointsSent(1);
      }

      await startBackgroundTrackingIfAvailable().catch(() => undefined);
      await loadOrders();
    } catch (orderError) {
      if (orderError instanceof ApiError && orderError.status === 409) {
        const existingRoute = await syncActiveRouteFromServer(session.accessToken).catch(() => null);
        if (existingRoute) {
          setScreen(existingRoute.serviceOrderId ? 'orders' : 'home');
          setError(
            existingRoute.serviceOrderId
              ? 'Ja existe uma OS em andamento. Recuperamos a rota ativa no app.'
              : 'Ja existe um turno em andamento. Recuperamos a rota ativa no app.',
          );
          return;
        }
      }
      setError(toMessage(orderError));
    } finally {
      setOrderBusyId(null);
    }
  }

  async function handleFinishOrder(order: ServiceOrder) {
    if (!session?.accessToken) {
      return;
    }

    const odometerKm = Number(orderKmInputs[order.id]?.finish || order.finalOdometerKm);
    if (!Number.isFinite(odometerKm) || odometerKm < 0) {
      setError('Informe o KM final antes de finalizar a OS.');
      return;
    }

    if (!order.finalOdometerPhotoPath) {
      setError('Envie a foto do odometro final antes de finalizar a OS.');
      return;
    }

    setOrderBusyId(order.id);
    setError(null);

    try {
      const point = (await getCurrentPointWithTimeout()) ?? lastLocation;
      if (order.routeShiftId) {
        await trySendPoint(session.accessToken, order.routeShiftId, point);
      }

      await apiFetch<ServiceOrder>(`/orders/${order.id}/finish`, {
        method: 'PATCH',
        token: session.accessToken,
        body: toJsonBody({
          odometerKm,
          latitude: point?.latitude,
          longitude: point?.longitude,
        }),
      });

      await stopBackgroundTrackingIfRunning().catch(() => undefined);
      if (activeRoute?.id === order.routeShiftId) {
        await clearActiveRoute();
        setActiveRoute(null);
      }
      await loadOrders();
      await loadHistory();
    } catch (orderError) {
      setError(toMessage(orderError));
    } finally {
      setOrderBusyId(null);
    }
  }

  async function handleUploadOrderPhoto(order: ServiceOrder, stage: 'START' | 'FINISH') {
    if (!session?.accessToken) {
      return;
    }

    const inputKey = stage === 'START' ? 'start' : 'finish';
    const odometerKm = Number(orderKmInputs[order.id]?.[inputKey]);
    if (!Number.isFinite(odometerKm) || odometerKm < 0) {
      setError(stage === 'START' ? 'Informe o KM inicial antes da foto.' : 'Informe o KM final antes da foto.');
      return;
    }

    setOrderBusyId(order.id);
    setError(null);

    try {
      const photo = await captureOdometerPhoto();
      await apiFetch<ServiceOrder>(`/orders/${order.id}/upload-odometer`, {
        method: 'POST',
        token: session.accessToken,
        body: toJsonBody({
          stage,
          odometerKm,
          ...photo,
        }),
      });
      await loadOrders();
    } catch (orderError) {
      setError(toMessage(orderError));
    } finally {
      setOrderBusyId(null);
    }
  }

  async function handleCompleteOrderStop(orderId: string, stopId: string) {
    if (!session?.accessToken) {
      return;
    }

    setOrderBusyId(orderId);
    setError(null);

    try {
      await apiFetch(`/orders/${orderId}/stops/${stopId}/complete`, {
        method: 'PATCH',
        token: session.accessToken,
      });
      await loadOrders();
    } catch (orderError) {
      setError(toMessage(orderError));
    } finally {
      setOrderBusyId(null);
    }
  }

  if (!ready) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando LocalTrak Rotas...</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <AppChrome colors={colors} theme={theme}>
        <LoginScreen
          busy={busy}
          colors={colors}
          error={error}
          onSubmit={handleLogin}
          onToggleTheme={handleToggleTheme}
          theme={theme}
        />
      </AppChrome>
    );
  }

  return (
    <AppChrome colors={colors} theme={theme}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={logo} style={styles.headerLogo} />
            <View style={styles.headerTextBlock}>
              <Text style={[styles.kicker, { color: colors.accent }]}>LocalTrak Rotas</Text>
            <Text style={styles.title}>Olá, {session.user.name}</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Empresa: {session.user.companyId ?? 'Nao vinculada'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.themeButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={handleToggleTheme}
            >
              <Text style={[styles.ghostButtonText, { color: colors.text }]}>
                {theme === 'dark' ? 'Claro' : 'Escuro'}
              </Text>
            </Pressable>
            <Pressable style={[styles.ghostButton, { borderColor: colors.border }]} onPress={handleLogout}>
              <Text style={[styles.ghostButtonText, { color: colors.text }]}>Sair</Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Status atual</Text>
          <Text style={[styles.statusText, { color: colors.text }]}>{routeStatus}</Text>
          {activeRoute ? (
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Turno iniciado em {formatDate(activeRoute.startedAt)}
            </Text>
          ) : null}
        </View>

        {lastSummary ? <SummaryCard summary={lastSummary} /> : null}

        {activeRoute ? (
          <ActiveRoutePanel
            busy={busy}
            elapsedSeconds={elapsedSeconds}
            lastLocation={lastLocation}
            onOpenOrders={() => setScreen('orders')}
            pointsSent={pointsSent}
            serviceOrderTitle={activeRoute.serviceOrderTitle}
            onFinish={handleFinishShift}
          />
        ) : (
          <Pressable style={[styles.primaryButton, busy && styles.disabledButton]} disabled={busy} onPress={handleStartShift}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Iniciar turno</Text>}
          </Pressable>
        )}

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tabButton, screen === 'home' && styles.tabButtonActive]}
            onPress={() => setScreen('home')}
          >
            <Text style={[styles.tabText, screen === 'home' && styles.tabTextActive]}>Inicio</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, screen === 'history' && styles.tabButtonActive]}
            onPress={() => {
              setScreen('history');
              void loadHistory();
            }}
          >
            <Text style={[styles.tabText, screen === 'history' && styles.tabTextActive]}>Historico</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, screen === 'orders' && styles.tabButtonActive]}
            onPress={() => {
              setScreen('orders');
              void loadOrders();
            }}
          >
            <Text style={[styles.tabText, screen === 'orders' && styles.tabTextActive]}>OS</Text>
          </Pressable>
        </View>

        {screen === 'history' ? (
          <HistoryList history={history} loading={historyLoading} onRefresh={loadHistory} />
        ) : screen === 'orders' ? (
          <OrdersList
            busyOrderId={orderBusyId}
            colors={colors}
            currentRouteId={activeRoute?.id ?? null}
            inputs={orderKmInputs}
            lastLocation={lastLocation}
            loading={ordersLoading}
            onCompleteStop={handleCompleteOrderStop}
            onFinishOrder={handleFinishOrder}
            onRefresh={loadOrders}
            onStartOrder={handleStartOrder}
            onUploadPhoto={handleUploadOrderPhoto}
            onUpdateKm={updateOrderKm}
            orders={orders}
          />
        ) : (
          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Rastreamento transparente</Text>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              A localizacao so e enviada depois que voce inicia o turno e para quando a rota e finalizada.
            </Text>
          </View>
        )}
      </ScrollView>
    </AppChrome>
  );
}

function AppChrome({
  children,
  colors,
  theme,
}: {
  children: ReactNode;
  colors: ThemeColors;
  theme: Theme;
}) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </SafeAreaView>
  );
}

function LoginScreen({
  busy,
  colors,
  error,
  onToggleTheme,
  onSubmit,
  theme,
}: {
  busy: boolean;
  colors: ThemeColors;
  error: string | null;
  onToggleTheme: () => Promise<void>;
  onSubmit: (email: string, password: string) => Promise<void>;
  theme: Theme;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.loginWrap, { backgroundColor: colors.background }]}
    >
      <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.mobileLogoWrap}>
          <Image source={logo} style={styles.mobileLogo} />
          <Pressable
            style={[styles.themeButton, { borderColor: colors.border, backgroundColor: colors.input }]}
            onPress={onToggleTheme}
          >
            <Text style={[styles.ghostButtonText, { color: colors.text }]}>
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.brand, { color: colors.accent }]}>LocalTrak Rotas</Text>
        <Text style={[styles.loginTitle, { color: colors.text }]}>Acesso do funcionario</Text>
        <Text style={[styles.loginSubtitle, { color: colors.muted }]}>
          Inicie e finalize sua rota de trabalho pelo app.
        </Text>

        <Text style={[styles.inputLabel, { color: colors.text }]}>E-mail</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="funcionario@empresa.com"
          placeholderTextColor={colors.muted}
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          value={email}
        />

        <Text style={[styles.inputLabel, { color: colors.text }]}>Senha</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="Sua senha"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={busy || !email || !password}
          onPress={() => void onSubmit(email.trim(), password)}
          style={[styles.primaryButton, (busy || !email || !password) && styles.disabledButton]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
        </Pressable>

        <Text style={[styles.apiHint, { color: colors.muted }]}>API: {API_URL}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function ActiveRoutePanel({
  busy,
  elapsedSeconds,
  lastLocation,
  onOpenOrders,
  pointsSent,
  serviceOrderTitle,
  onFinish,
}: {
  busy: boolean;
  elapsedSeconds: number;
  lastLocation: RoutePointPayload | null;
  onOpenOrders: () => void;
  pointsSent: number;
  serviceOrderTitle?: string | null;
  onFinish: () => Promise<void>;
}) {
  return (
    <View style={styles.activePanel}>
      <Text style={styles.cardLabel}>Rota em andamento</Text>
      {serviceOrderTitle ? <Text style={styles.subtitle}>OS: {serviceOrderTitle}</Text> : null}
      <Text style={styles.timer}>{formatElapsed(elapsedSeconds)}</Text>
      <View style={styles.metricRow}>
        <Metric label="Pontos enviados" value={String(pointsSent)} />
        <Metric label="Precisao" value={lastLocation?.accuracy ? `${Math.round(lastLocation.accuracy)} m` : '-'} />
      </View>
      <Text style={styles.subtitle}>
        {lastLocation ? `Lat ${lastLocation.latitude.toFixed(5)} - Lng ${lastLocation.longitude.toFixed(5)}` : 'Aguardando ponto de GPS'}
      </Text>
      {serviceOrderTitle ? (
        <Pressable style={styles.secondaryButton} onPress={onOpenOrders}>
          <Text style={styles.secondaryButtonText}>Finalizar pela aba OS</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.dangerButton, busy && styles.disabledButton]} disabled={busy} onPress={() => void onFinish()}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Finalizar turno</Text>}
        </Pressable>
      )}
    </View>
  );
}

function SummaryCard({ summary }: { summary: RouteSummary }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.cardLabel}>Resumo da ultima rota</Text>
      <View style={styles.metricRow}>
        <Metric label="Km" value={formatKm(summary.totalDistanceKm)} />
        <Metric label="Tempo" value={`${summary.totalDurationMinutes ?? 0} min`} />
      </View>
      <Text style={styles.subtitle}>Inicio: {formatDate(summary.startedAt)}</Text>
      <Text style={styles.subtitle}>Fim: {formatDate(summary.endedAt)}</Text>
      <Text style={styles.subtitle}>Status: {statusLabels[summary.status] ?? summary.status}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function HistoryList({
  history,
  loading,
  onRefresh,
}: {
  history: RouteSummary[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  if (loading) {
    return (
      <View style={styles.infoBox}>
        <ActivityIndicator color="#1f6feb" />
        <Text style={styles.infoText}>Carregando historico...</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Nenhuma rota registrada</Text>
        <Text style={styles.infoText}>Quando voce finalizar um turno, ele aparecera aqui.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void onRefresh()}>
          <Text style={styles.secondaryButtonText}>Atualizar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.historyItem}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{formatDate(item.startedAt)}</Text>
            <Text style={styles.badge}>{statusLabels[item.status] ?? item.status}</Text>
          </View>
          <Text style={styles.subtitle}>Fim: {formatDate(item.endedAt)}</Text>
          <Text style={styles.subtitle}>
            {formatKm(item.totalDistanceKm)} - {item.totalDurationMinutes ?? 0} min
          </Text>
          {item.vehicle ? (
            <Text style={styles.subtitle}>
              Veiculo: {item.vehicle.plate} - {item.vehicle.brand} {item.vehicle.model}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

function OrdersList({
  busyOrderId,
  colors,
  currentRouteId,
  inputs,
  lastLocation,
  loading,
  onCompleteStop,
  onFinishOrder,
  onRefresh,
  onStartOrder,
  onUploadPhoto,
  onUpdateKm,
  orders,
}: {
  busyOrderId: string | null;
  colors: ThemeColors;
  currentRouteId: string | null;
  inputs: Record<string, { start: string; finish: string }>;
  lastLocation: RoutePointPayload | null;
  loading: boolean;
  onCompleteStop: (orderId: string, stopId: string) => Promise<void>;
  onFinishOrder: (order: ServiceOrder) => Promise<void>;
  onRefresh: () => Promise<void>;
  onStartOrder: (order: ServiceOrder) => Promise<void>;
  onUploadPhoto: (order: ServiceOrder, stage: 'START' | 'FINISH') => Promise<void>;
  onUpdateKm: (orderId: string, key: 'start' | 'finish', value: string) => void;
  orders: ServiceOrder[];
}) {
  if (loading) {
    return (
      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.infoText, { color: colors.muted }]}>Carregando ordens de servico...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>Nenhuma OS para hoje</Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>Quando a empresa atribuir ordens de servico para voce, elas aparecerao aqui.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void onRefresh()}>
          <Text style={styles.secondaryButtonText}>Atualizar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.ordersList}>
      {orders.map((order) => {
        const busy = busyOrderId === order.id;
        const completedStops = order.stops.filter((stop) => stop.status === 'COMPLETED').length;

        return (
          <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.historyHeader}>
              <View style={styles.orderTitleBlock}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>{order.title}</Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>{formatDate(order.scheduledDate)}</Text>
              </View>
              <Text style={styles.badge}>{orderStatusLabels[order.status] ?? order.status}</Text>
            </View>

            {order.description ? <Text style={[styles.infoText, { color: colors.muted }]}>{order.description}</Text> : null}
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Veiculo: {order.vehicle ? `${order.vehicle.plate} - ${order.vehicle.brand} ${order.vehicle.model}` : 'Sem veiculo'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Paradas: {completedStops}/{order.stops.length} concluidas
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>KM odometro: {formatKm(order.odometerDistanceKm)}</Text>

            <OrderMapPreview
              colors={colors}
              currentPoint={order.routeShiftId === currentRouteId ? lastLocation : null}
              order={order}
            />

            <View style={styles.orderStops}>
              {order.stops.map((stop) => (
                <View key={stop.id} style={[styles.orderStopItem, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <View style={styles.orderStopText}>
                    <Text style={[styles.orderStopTitle, { color: colors.text }]}>
                      {stop.visitOrder}. {stop.customerName ?? 'Cliente'}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.muted }]}>{stop.address}</Text>
                    <Text style={[styles.subtitle, { color: colors.muted }]}>{stop.status === 'COMPLETED' ? 'Concluido' : 'Pendente'}</Text>
                  </View>
                  {order.status === 'IN_PROGRESS' && stop.status !== 'COMPLETED' ? (
                    <Pressable
                      disabled={busy}
                      onPress={() => void onCompleteStop(order.id, stop.id)}
                      style={[styles.smallActionButton, busy && styles.disabledButton]}
                    >
                      <Text style={styles.smallActionText}>Concluir</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            {order.status === 'PENDING' ? (
              <View style={styles.orderActionArea}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>KM inicial</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(value) => onUpdateKm(order.id, 'start', value)}
                  placeholder="Ex.: 18420"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
                  value={inputs[order.id]?.start ?? ''}
                />
                <Pressable
                  disabled={busy}
                  onPress={() => void onUploadPhoto(order, 'START')}
                  style={[styles.secondaryButton, busy && styles.disabledButton]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {order.initialOdometerPhotoPath ? 'Foto inicial enviada' : 'Enviar foto inicial'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busy || !order.initialOdometerPhotoPath}
                  onPress={() => void onStartOrder(order)}
                  style={[styles.primaryButton, (busy || !order.initialOdometerPhotoPath) && styles.disabledButton]}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Iniciar rota da OS</Text>}
                </Pressable>
              </View>
            ) : null}

            {order.status === 'IN_PROGRESS' ? (
              <View style={styles.orderActionArea}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>KM final</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(value) => onUpdateKm(order.id, 'finish', value)}
                  placeholder="Ex.: 18472"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
                  value={inputs[order.id]?.finish ?? ''}
                />
                <Pressable
                  disabled={busy}
                  onPress={() => void onUploadPhoto(order, 'FINISH')}
                  style={[styles.secondaryButton, busy && styles.disabledButton]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {order.finalOdometerPhotoPath ? 'Foto final enviada' : 'Enviar foto final'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busy || !order.finalOdometerPhotoPath}
                  onPress={() => void onFinishOrder(order)}
                  style={[styles.dangerButton, (busy || !order.finalOdometerPhotoPath) && styles.disabledButton]}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Finalizar jornada da OS</Text>}
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function toMapCoordinate(latitude?: number | string | null, longitude?: number | string | null) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { latitude: lat, longitude: lng };
}

function OrderMapPreview({
  colors,
  currentPoint,
  order,
}: {
  colors: ThemeColors;
  currentPoint: RoutePointPayload | null;
  order: ServiceOrder;
}) {
  const stops = order.stops
    .map((stop) => ({
      stop,
      coordinate: toMapCoordinate(stop.latitude, stop.longitude),
    }))
    .filter((item): item is { stop: ServiceOrder['stops'][number]; coordinate: { latitude: number; longitude: number } } =>
      Boolean(item.coordinate),
    );
  const currentCoordinate = currentPoint ? { latitude: currentPoint.latitude, longitude: currentPoint.longitude } : null;
  const nextStop = stops.find(({ stop }) => stop.status !== 'COMPLETED') ?? stops[0] ?? null;
  const firstCoordinate = currentCoordinate ?? nextStop?.coordinate ?? stops[0]?.coordinate;

  if (!firstCoordinate) {
    return (
      <View style={[styles.mobileMapFallback, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>Mapa da OS</Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>Esta OS ainda nao possui coordenadas nos enderecos.</Text>
      </View>
    );
  }

  if (Platform.OS === 'web' || !NativeMapView || !NativeMarker || !NativePolyline) {
    const url = `https://www.openstreetmap.org/?mlat=${firstCoordinate.latitude}&mlon=${firstCoordinate.longitude}#map=16/${firstCoordinate.latitude}/${firstCoordinate.longitude}`;
    return (
      <View style={[styles.mobileMapFallback, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>Mapa da OS</Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          Proximo endereco: {nextStop?.stop.address ?? 'coordenada selecionada'}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(url)}>
          <Text style={styles.secondaryButtonText}>Abrir no OpenStreetMap</Text>
        </Pressable>
      </View>
    );
  }

  const plannedPath = stops.map(({ coordinate }) => coordinate);
  const path = currentCoordinate ? [currentCoordinate, ...plannedPath] : plannedPath;

  return (
    <View style={[styles.mobileMapCard, { borderColor: colors.border }]}>
      <NativeMapView
        initialRegion={{
          ...firstCoordinate,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        style={styles.mobileMap}
      >
        {path.length > 1 ? (
          <NativePolyline
            coordinates={path}
            strokeColor={order.status === 'FINISHED' ? '#176b87' : '#ff7a1a'}
            strokeWidth={4}
          />
        ) : null}
        {currentCoordinate ? (
          <NativeMarker coordinate={currentCoordinate} title="Posicao atual" pinColor="#20855a" />
        ) : null}
        {stops.map(({ coordinate, stop }) => (
          <NativeMarker
            coordinate={coordinate}
            key={stop.id}
            pinColor={stop.status === 'COMPLETED' ? '#20855a' : '#ff7a1a'}
            title={`${stop.visitOrder}. ${stop.customerName ?? 'Cliente'}`}
            description={stop.address}
          />
        ))}
      </NativeMapView>
      <View style={[styles.mobileMapLegend, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          {nextStop ? `Proximo: ${nextStop.stop.address}` : 'Todas as paradas foram concluidas.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#556070',
    marginTop: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerBrand: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerLogo: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 56,
    width: 56,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  kicker: {
    color: '#1f6feb',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#142033',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#5c6675',
    fontSize: 14,
    marginTop: 4,
  },
  loginWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dce3ee',
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
  },
  mobileLogoWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  mobileLogo: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 74,
    width: 74,
  },
  brand: {
    color: '#1f6feb',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  loginTitle: {
    color: '#142033',
    fontSize: 25,
    fontWeight: '800',
  },
  loginSubtitle: {
    color: '#5c6675',
    fontSize: 15,
    marginBottom: 24,
    marginTop: 8,
  },
  inputLabel: {
    color: '#26364c',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#d7deea',
    borderRadius: 8,
    borderWidth: 1,
    color: '#142033',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#d12f2f',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#1f6feb',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#1f6feb',
    fontSize: 15,
    fontWeight: '800',
  },
  ghostButton: {
    borderColor: '#c8d2e1',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  themeButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ghostButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
  error: {
    backgroundColor: '#fff0f0',
    borderColor: '#f0b6b6',
    borderRadius: 8,
    borderWidth: 1,
    color: '#a11f1f',
    marginTop: 14,
    padding: 12,
  },
  apiHint: {
    color: '#7a8494',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dce3ee',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  summaryCard: {
    backgroundColor: '#eef6ff',
    borderColor: '#c7ddfb',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  activePanel: {
    backgroundColor: '#ffffff',
    borderColor: '#b7d0f6',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
  },
  cardLabel: {
    color: '#5c6675',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusText: {
    color: '#142033',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  timer: {
    color: '#142033',
    fontSize: 42,
    fontWeight: '900',
    marginTop: 10,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  metric: {
    backgroundColor: '#f8fafc',
    borderColor: '#dce3ee',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  metricValue: {
    color: '#142033',
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#5c6675',
    fontSize: 12,
    marginTop: 4,
  },
  tabs: {
    backgroundColor: '#e8edf5',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
    marginTop: 12,
    padding: 4,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#5c6675',
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#1f6feb',
  },
  infoBox: {
    backgroundColor: '#ffffff',
    borderColor: '#dce3ee',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  infoTitle: {
    color: '#142033',
    fontSize: 17,
    fontWeight: '900',
  },
  infoText: {
    color: '#5c6675',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  historyItem: {
    backgroundColor: '#ffffff',
    borderColor: '#dce3ee',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  historyTitle: {
    color: '#142033',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: '#eaf3ff',
    borderRadius: 999,
    color: '#1f6feb',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dce3ee',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  orderTitleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  orderStops: {
    gap: 8,
    marginTop: 14,
  },
  orderStopItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#dce3ee',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 12,
  },
  orderStopText: {
    flex: 1,
  },
  orderStopTitle: {
    color: '#142033',
    fontSize: 14,
    fontWeight: '900',
  },
  orderActionArea: {
    marginTop: 12,
  },
  mobileMapCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
  },
  mobileMap: {
    height: 210,
    width: '100%',
  },
  mobileMapFallback: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  mobileMapLegend: {
    borderTopColor: '#dce3ee',
    borderTopWidth: 1,
    padding: 12,
  },
  smallActionButton: {
    alignItems: 'center',
    backgroundColor: '#0b2a52',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  smallActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
