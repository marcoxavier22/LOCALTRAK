'use client';

type GoogleMapPreviewProps = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  title?: string;
};

function toCoordinate(latitude?: number | string | null, longitude?: number | string | null) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : null;
}

function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function GoogleMapPreview({ latitude, longitude, address, title = 'Mapa' }: GoogleMapPreviewProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const coordinate = toCoordinate(latitude, longitude);
  const query = coordinate ?? address ?? '';
  const externalUrl = googleMapsUrl(query);

  if (!query) {
    return (
      <div className="google-map-fallback">
        <strong>{title}</strong>
        <span>Endereço ou coordenada indisponivel.</span>
      </div>
    );
  }

  if (!key) {
    return (
      <div className="google-map-fallback">
        <strong>{title}</strong>
        <span>{address ?? coordinate}</span>
        <a className="button secondary small" href={externalUrl} rel="noreferrer" target="_blank">
          Abrir no Google Maps
        </a>
      </div>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`;

  return (
    <div className="google-map-preview">
      <iframe
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={src}
        title={title}
      />
      <a className="button secondary small" href={externalUrl} rel="noreferrer" target="_blank">
        Abrir no Google Maps
      </a>
    </div>
  );
}
