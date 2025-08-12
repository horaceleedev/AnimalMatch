import React, { useMemo } from 'react'
import "leaflet/dist/leaflet.css";
// import "npm:leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
// import "npm:leaflet-defaulticon-compatibility";
import { Icon as LeafletIcon } from "leaflet";
import { MapContainer, Marker, ScaleControl, TileLayer, Tooltip } from 'react-leaflet';
import { mean } from 'es-toolkit';

import { LocationInfo } from '../types';

type BasicMapViewProps = {
  uniqueLocations: LocationInfo[];
  highlightLocationIds?: string[]; // each string is created using JSON.stringify([lat, long])
  style: React.CSSProperties;
};

const BasicMapView = ({uniqueLocations, highlightLocationIds, style}: BasicMapViewProps) => {
  const mapCenter = useMemo(() => [
    mean(uniqueLocations.map(location => location.lat)),
    mean(uniqueLocations.map(location => location.long)),
  ], [uniqueLocations]);

  const mapBounds = useMemo(() => {
    if (uniqueLocations.length === 0) return undefined;

    const meanLat = mean(uniqueLocations.map(location => location.lat));
    const meanLong = mean(uniqueLocations.map(location => location.long));

    const minLat = Math.min(...uniqueLocations.map(location => location.lat));
    const minLong = Math.min(...uniqueLocations.map(location => location.long));
    const maxLat = Math.max(...uniqueLocations.map(location => location.lat));
    const maxLong = Math.max(...uniqueLocations.map(location => location.long));

    const height = maxLat - minLat;
    const width = maxLong - minLong;

    return [
      [ meanLat - height, meanLong - width ],
      [ meanLat + height, meanLong + width ],
    ];
  }, [uniqueLocations]);
  
  return (
    <MapContainer style={style} center={mapCenter} bounds={mapBounds}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {
        uniqueLocations.map(locationInfo => (
          <Marker
            key={locationInfo.id}
            position={[locationInfo.lat, locationInfo.long]}
            eventHandlers={{
              click: (e) => {
                // TODO implement filtering based on clicked marker (i.e. only show videos belonging to the clicked marker)
                // console.log(e)
              }
            }}
            // opacity={
            //   !highlightLocationId || (locationInfo.id === highlightLocationId) ? 1 : 0.4
            // }
            icon={
              // display different marker colors https://github.com/pointhi/leaflet-color-markers
              new LeafletIcon({
                iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${(!highlightLocationIds || highlightLocationIds.includes(locationInfo.id)) ? 'blue' : 'grey'}.png`,
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              })
            }
          >
            <Tooltip>{locationInfo.tooltipText}</Tooltip>
          </Marker>
        ))
      }
      <ScaleControl position="bottomleft" />
    </MapContainer>
  );
};

export default BasicMapView;