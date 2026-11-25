
import React from "react";
import  { useEffect } from "react";
import { useMap } from "react-leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";



import L from "leaflet";

const getBinIcon = (status) => {
  let color = "#16a34a";

  if (status === "Warning") {
    color = "#f59e0b";
  } else if (status === "Critical") {
    color = "#dc2626";
  }

  return L.divIcon({
    className: "custom-bin-marker",
    html: `<div style="
      background:${color};
      width:22px;
      height:22px;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px #555;
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const getRouteIcon = (number) => {
  return L.divIcon({
    className: "route-number-marker",
    html: `<div style="
      background:#14532d;
      color:white;
      width:30px;
      height:30px;
      border:3px solid white;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:bold;
      font-size:13px;
      box-shadow:0 2px 6px #555;
    ">${number}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

function MapAutoFit({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, {
        padding: [40, 40],
        maxZoom: 15
      });
    }
  }, [map, positions]);

  return null;
}

function BinMap({ bins = [], route = [] }) {
  const validBins = bins.filter(
    (bin) =>
      Number.isFinite(Number(bin.latitude)) &&
      Number.isFinite(Number(bin.longitude)) &&
      bin.latitude !== null &&
      bin.longitude !== null
  );

  const center = validBins.length > 0
    ? [Number(validBins[0].latitude), Number(validBins[0].longitude)]
    : [11.0168, 76.9558];

    const routePositions = route
  .filter(
    (bin) =>
      Number.isFinite(Number(bin.latitude)) &&
      Number.isFinite(Number(bin.longitude)) &&
      bin.latitude !== null &&
      bin.longitude !== null
  )
  .map((bin) => [
    Number(bin.latitude),
    Number(bin.longitude)
  ]);

const allPositions = [
  ...validBins.map((bin) => [
    Number(bin.latitude),
    Number(bin.longitude)
  ]),
  ...routePositions
];

  return (
    <div className="bin-map-container">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validBins.map((bin) => (
            
          <Marker
            key={bin.binId}
            position={[
              Number(bin.latitude),
              Number(bin.longitude)
            ]}
            icon={getBinIcon(bin.status)}
          >
            <Popup>
              <strong>{bin.binId}</strong>
              <br />
              {bin.location}
              <br />
              Fill Level: {bin.fillLevel}%
              <br />
              Status: {bin.status}
            </Popup>
          </Marker>
          
        ))}
        {route.length > 0 && (
  <Polyline
    positions={route.map((bin) => [
      Number(bin.latitude),
      Number(bin.longitude)
    ])}
    pathOptions={{
      color: "#15803d",
      weight: 5,
      opacity: 0.8
    }}
  />
  
)}
{routePositions.map((position, index) => (
  <Marker
    key={`route-${index}`}
    position={position}
    icon={getRouteIcon(index + 1)}
  >
    <Popup>
      <strong>Collection Stop {index + 1}</strong>
      <br />
      {route[index].binId}
      <br />
      {route[index].location}
      <br />
      Fill Level: {route[index].fillLevel}%
    </Popup>
  </Marker>
))}
      </MapContainer>

      {validBins.length === 0 && (
        <p className="map-empty-message">
          No bins with GPS coordinates available.
        </p>
      )}
    </div>
  );
}

export default BinMap;
