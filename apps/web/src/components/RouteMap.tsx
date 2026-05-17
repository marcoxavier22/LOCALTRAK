'use client';

import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { RoutePoint } from '@/types';
import { formatDateTime } from '@/lib/route-labels';

type MapPoint = {
  latitude: number | string;
  longitude: number | string;
  recordedAt?: string | Date | null;
};

type RouteMapProps = {
  points?: RoutePoint[];
  startPoint?: MapPoint | null;
  currentPoint?: MapPoint | null;
  endPoint?: MapPoint | null;
  waypointPoints?: Array<MapPoint & { id?: string; label?: string; status?: string }>;
  status?: string;
  compact?: boolean;
};

function toLatLng(point?: MapPoint | RoutePoint | null): [number, number] | null {
  if (!point) {
    return null;
  }

  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
}

function formatPointTime(point?: MapPoint | RoutePoint | null) {
  if (!point?.recordedAt) {
    return '-';
  }

  return formatDateTime(
    point.recordedAt instanceof Date ? point.recordedAt.toISOString() : String(point.recordedAt),
  );
}

function BoundsController({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 16);
      return;
    }

    map.fitBounds(positions, { padding: [28, 28], maxZoom: 17 });
  }, [map, positions]);

  return null;
}

export function RouteMap({
  points = [],
  startPoint,
  currentPoint,
  endPoint,
  waypointPoints = [],
  status,
  compact,
}: RouteMapProps) {
  const path = useMemo(
    () =>
      points
        .map(toLatLng)
        .filter((position): position is [number, number] => Boolean(position)),
    [points],
  );
  const startPosition = toLatLng(startPoint) ?? path[0] ?? null;
  const currentPosition = toLatLng(currentPoint) ?? path[path.length - 1] ?? null;
  const endPosition = toLatLng(endPoint);
  const waypoints = useMemo(
    () =>
      waypointPoints
        .map((point) => ({ point, position: toLatLng(point) }))
        .filter((item): item is { point: MapPoint & { id?: string; label?: string; status?: string }; position: [number, number] } =>
          Boolean(item.position),
        ),
    [waypointPoints],
  );
  const positions = useMemo(() => {
    const merged = [
      startPosition,
      ...path,
      ...waypoints.map((waypoint) => waypoint.position),
      currentPosition,
      endPosition,
    ].filter((position): position is [number, number] => Boolean(position));

    return merged.filter(
      (position, index, list) =>
        list.findIndex((item) => item[0] === position[0] && item[1] === position[1]) === index,
    );
  }, [currentPosition, endPosition, path, startPosition, waypoints]);
  const center = (positions[0] ?? [-23.55052, -46.633308]) as LatLngExpression;

  if (positions.length === 0) {
    return (
      <div className={compact ? 'route-map route-map-compact route-map-empty' : 'route-map route-map-empty'}>
        <strong>Sem pontos GPS</strong>
        <span>Assim que o app enviar pontos, o trajeto aparece aqui.</span>
      </div>
    );
  }

  return (
    <div className={compact ? 'route-map route-map-compact' : 'route-map'}>
      <MapContainer center={center} zoom={15} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <BoundsController positions={positions} />
        {path.length > 1 ? (
          <Polyline
            pathOptions={{
              color: status === 'FINISHED' ? '#176b87' : '#20855a',
              opacity: 0.92,
              weight: compact ? 4 : 5,
            }}
            positions={path}
          />
        ) : null}
        {startPosition ? (
          <CircleMarker center={startPosition} pathOptions={{ color: '#315f9f', fillColor: '#315f9f', fillOpacity: 0.9 }} radius={8}>
            <Popup>
              <strong>Inicio</strong>
              <br />
              {formatPointTime(startPoint ?? points[0])}
            </Popup>
          </CircleMarker>
        ) : null}
        {endPosition ? (
          <CircleMarker center={endPosition} pathOptions={{ color: '#b42318', fillColor: '#b42318', fillOpacity: 0.9 }} radius={8}>
            <Popup>
              <strong>Fim</strong>
              <br />
              {formatPointTime(endPoint)}
            </Popup>
          </CircleMarker>
        ) : null}
        {waypoints.map(({ point, position }, index) => (
          <CircleMarker
            center={position}
            key={point.id ?? `${position[0]}-${position[1]}-${index}`}
            pathOptions={{
              color: point.status === 'COMPLETED' ? '#20855a' : '#ff7a1a',
              fillColor: point.status === 'COMPLETED' ? '#20855a' : '#ff7a1a',
              fillOpacity: 0.9,
            }}
            radius={compact ? 7 : 8}
          >
            <Popup>
              <strong>{point.label ?? `Parada ${index + 1}`}</strong>
              <br />
              {point.status ? `Status: ${point.status}` : 'Endereco planejado'}
            </Popup>
          </CircleMarker>
        ))}
        {currentPosition ? (
          <CircleMarker center={currentPosition} pathOptions={{ color: '#20855a', fillColor: '#20855a', fillOpacity: 0.95 }} radius={compact ? 9 : 11}>
            <Popup>
              <strong>{status === 'FINISHED' ? 'Ultimo ponto' : 'Ponto atual'}</strong>
              <br />
              {formatPointTime(currentPoint ?? points[points.length - 1])}
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  );
}
