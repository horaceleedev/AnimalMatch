import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Divider } from "antd";
import dayjs from "dayjs";

import BasicMapView from '../components/BasicMapView.tsx';
import { Individual, LocationInfo, MetadataFieldsType, RecordType, Video } from '../types.ts';
import { individualsMetadataFields, videoMetadataFields } from '../metadata.tsx';
import IndividualsGridView from "./IndividualsGridView.tsx";
import RecordMetadataForm from "./RecordMetadataForm.tsx";

type VideoDetailViewProps = {
  video: Video,
  // videoMetadataFields: MetadataFieldsType,
  individualsInVideo: Individual[],
  uniqueValuesPerField: Record<string, string[]>,
  uniqueLocations: LocationInfo[],
  individualsLinkTemplate?: string;
  openModal?: (type: RecordType , id: string) => void;
  updateVideo: (id: string, data: Partial<Video>) => Promise<Video>;
};

const VideoDetailView: React.FC<VideoDetailViewProps> = ({
  video,
  individualsInVideo,
  uniqueValuesPerField,
  uniqueLocations,
  individualsLinkTemplate,
  openModal,
  updateVideo,
}: VideoDetailViewProps) => {
  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);
  
  return (
    <>
      <video src={video.url} style={{width: '100%', maxWidth: 800}} controls autoPlay />
      <br />
      <Link to="annotate"><Button type="primary">Annotate individuals</Button></Link>
      <br />
      <Divider />
      <h3>Individuals</h3>
      <IndividualsGridView 
        processedRecords={individualsInVideo}
        metadataFields={individualsMetadataFields}
        processedRecordsPropName="individuals"
        basicGridViewProps={{
          individuals: individualsInVideo,
          individualsMetadataFields: individualsMetadataFields,
          linkTemplate: individualsLinkTemplate,
          allowEditingAgeAndSex: true,
          openModal: openModal,
        }}
        sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]}
      />
      <Divider />
      <h3>Video metadata</h3>
      <RecordMetadataForm
        processedRecord={video}
        metadataFields={videoMetadataFields}
        uniqueValuesPerField={uniqueValuesPerField}
        updateFunction={updateVideo}
        showIconInSelectionFields={true}
      />
      {
        showMap && // Temporary hack needed because map wasn't showing up properly
        <BasicMapView style={{height: 400, width: 600}} uniqueLocations={uniqueLocations} highlightLocationIds={[JSON.stringify([video.lat, video.long])]} />
      }
    </>
  );
};

export default VideoDetailView;