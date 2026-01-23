import { FC, useEffect, useMemo, useRef, useState } from "react";
import { Button, Divider, Flex } from "antd";
import { useNavigate } from "react-router-dom";

import BasicMapView from '../ui/BasicMapView.tsx';
import { Individual, LocationInfo, RecordType, Video } from '../../types.ts';
import { individualsMetadataFields, videoMetadataFields } from '../../metadata.tsx';
import IndividualsGridView from "../grid-views/IndividualsGridView.tsx";
import RecordMetadataForm from "./RecordMetadataForm.tsx";
import { PrevNextVideoButtons } from "../ui/PrevNextButtons.tsx";

import "./VideoDetailView.scss";

type VideoDetailViewProps = {
  video: Video,
  // videoMetadataFields: MetadataFieldsType,
  timestamp?: number,
  individualsInVideo: Individual[],
  uniqueValuesPerField: Record<string, string[]>,
  uniqueLocations: LocationInfo[],
  individualsLinkTemplate?: string;
  videoLinkTemplate?: string;
  navigationVideos?: Video[],
  openModal?: (type: RecordType , id: string) => void;
  updateVideo: (id: string, data: Partial<Video>) => Promise<Video>;
};

const VideoDetailView: FC<VideoDetailViewProps> = ({
  video,
  timestamp,
  individualsInVideo,
  uniqueValuesPerField,
  uniqueLocations,
  individualsLinkTemplate,
  videoLinkTemplate,
  navigationVideos = [],
  openModal,
  updateVideo,
}: VideoDetailViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Seek to timestamp when available
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || timestamp === undefined) return;

    const seek = () => {
      vid.currentTime = timestamp;
    };

    // Seek to timstamp after metadata is loaded
    if (vid.readyState >= 1) {
      seek();
    } else {
      vid.addEventListener("loadedmetadata", seek, { once: true });
    }
  }, [timestamp]);

  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);

  const navigate = useNavigate();
  function openAnnotationEditor() {
    navigate("annotate");
  };

  const highlightLocationIds = useMemo(
    () => new Set([JSON.stringify([video.lat, video.long])]),
    [video]
  );

  return (
    <>
      <Flex justify="space-between" vertical className="video-with-toolbar">
        <video
          ref={videoRef}
          src={video.url}
          controls
          autoPlay
        />
        <div className="video-toolbar">
          <Button type="primary" onClick={openAnnotationEditor}>
            Annotate individuals
          </Button>
          <PrevNextVideoButtons record={video} recordLinkTemplate={videoLinkTemplate} records={navigationVideos} />
        </div>
      </Flex>
      <Divider />
      <h3>Individuals</h3>
      {individualsInVideo.length === 0 ? (
        <p>No individuals annotated in this video yet.</p>
      ) : (
        <IndividualsGridView
          individuals={individualsInVideo}
          individualsMetadataFields={individualsMetadataFields}
          linkTemplate={individualsLinkTemplate}
          allowEditingAgeAndSex={true}
          openModal={openModal}
          sortFields={[]}
          sortOrders={[]}
          groupFields={[]}
          groupOrders={[]}
        />
      )}
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
        <BasicMapView
          style={{height: 400, width: 600}}
          uniqueLocations={uniqueLocations}
          highlightLocationIds={highlightLocationIds}
        />
      }
    </>
  );
};

export default VideoDetailView;
