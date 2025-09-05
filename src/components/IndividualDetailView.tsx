import React, { useEffect, useState } from 'react'
import { Image } from "antd";

import { individualsMetadataFields, videoMetadataFields } from '../metadata.tsx';
import VideosGridView from '../components/VideosGridView.tsx';
import IndividualsGridView from '../components/IndividualsGridView.tsx';
import { Individual, LocationInfo, Video } from '../types.ts';
import BasicMapView from './BasicMapView.tsx';
import RecordMetadataForm from './RecordMetadataForm.tsx';

type IndividualDetailViewProps = {
  individual: Individual;
  seenTogetherIndividuals: Individual[];
  videosWithIndividual: Video[];
  uniqueValuesPerField: Record<string, string[]>;
  uniqueLocations: LocationInfo[];
  updateIndividual: (id: string, data: Partial<Individual>) => Promise<void>;
}

const IndividualDetailView: React.FC<IndividualDetailViewProps> = ({
  individual,
  seenTogetherIndividuals,
  videosWithIndividual,
  uniqueValuesPerField,
  uniqueLocations,
  updateIndividual,
}: IndividualDetailViewProps) => {
  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);

  return (
    <>
      {/* Images display */}
      <div style={{display: "flex", flexWrap: "wrap", columnGap: 5, rowGap: 5}}>
        <Image.PreviewGroup>
          {
            individual.imageUrls.map(img => (
              <Image
                key={img}
                height={150}
                src={img}
                style={{width: 'unset'}}
              />
            ))
          }
        </Image.PreviewGroup>
      </div>
      {/* <div style={{display: 'flex', overflow: 'scroll', height: 150, columnGap: 5}}>
        {
          individual.imageUrls.map(img => (
            <img
              key={img}
              src={img}
              style={{display: 'inline-block', height: 150}}
            />
          ))
        }
      </div> */}
      <br />
      <RecordMetadataForm
        processedRecord={individual}
        metadataFields={individualsMetadataFields}
        uniqueValuesPerField={uniqueValuesPerField}
        updateFunction={updateIndividual}
      />
      <div style={{padding: 10}}>
        <h2>Videos with this individual</h2>
        <VideosGridView videos={videosWithIndividual} videoMetadataFields={videoMetadataFields} isListView={false} sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]} />
        {
          (seenTogetherIndividuals.length > 0) &&
          <>
            <h2>Other individuals seen together with this individual</h2>
            <IndividualsGridView individuals={seenTogetherIndividuals} individualsMetadataFields={individualsMetadataFields} sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]} />
          </>
        }
      </div>
      {
        showMap && // Temporary hack needed because map wasn't showing up properly
        <BasicMapView
          style={{height: 400, width: 600}}
          uniqueLocations={uniqueLocations} 
          highlightLocationIds={videosWithIndividual.map(video => JSON.stringify([video.lat, video.long]))}
        />
      }
    </>
  )
}

export default IndividualDetailView