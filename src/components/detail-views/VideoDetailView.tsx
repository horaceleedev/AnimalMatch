import { FC, useEffect, useMemo, useState } from "react";
import { generatePath, useNavigate } from "react-router-dom";
import { Button, Divider, Flex } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

import BasicMapView from '../ui/BasicMapView.tsx';
import { Individual, LocationInfo, RecordType, Video } from '../../types.ts';
import { individualsMetadataFields, videoMetadataFields } from '../../metadata.tsx';
import IndividualsGridView from "../grid-views/IndividualsGridView.tsx";
import RecordMetadataForm from "./RecordMetadataForm.tsx";

import "./VideoDetailView.scss";

const VideoToolbar: FC<{
  video: Video,
  videoLinkTemplate?: string,
  videos?: Video[],
}> = ({
  video,
  videoLinkTemplate = "/videos/:videoId",
  videos = [],
}) => {
  const navigate = useNavigate();
  const videoIndex = videos.findIndex(v => v.id === video.id);
  let nextVideoId = '';
  let prevVideoId = '';
  if (videoIndex < videos.length - 1) {
    // If not the last video
    nextVideoId = videos[videoIndex + 1].id;
  }
  if (videoIndex > 0) {
    // If not the first video
    prevVideoId = videos[videoIndex - 1].id;
  }

  function openAnnotationEditor() {
    navigate("annotate");
  }

  function navigateToVideo(videoId: string) {
    return () => navigate(generatePath(videoLinkTemplate, { videoId }));
  }

  return (
    <div className="video-toolbar">
      <Button type="primary" onClick={openAnnotationEditor}>
        Annotate individuals
      </Button>
      <Flex gap="middle" justify="start">
        <Button
          aria-label="Previous video"
          shape="circle" icon={<LeftOutlined />}
          disabled={!prevVideoId}
          onClick={navigateToVideo(prevVideoId)}
        />
        <Button
          aria-label="Next video"
          shape="circle"
          icon={<RightOutlined />}
          disabled={!nextVideoId}
          onClick={navigateToVideo(nextVideoId)}
        />
      </Flex>
    </div>
  );
}

type VideoDetailViewProps = {
  video: Video,
  // videoMetadataFields: MetadataFieldsType,
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
  individualsInVideo,
  uniqueValuesPerField,
  uniqueLocations,
  individualsLinkTemplate,
  videoLinkTemplate,
  navigationVideos = [],
  openModal,
  updateVideo,
}: VideoDetailViewProps) => {
  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);

  const highlightLocationIds = useMemo(
    () => new Set([JSON.stringify([video.lat, video.long])]),
    [video]
  );

  return (
    <>
      <Flex justify="space-between" vertical className="video-with-toolbar">
        <video
          src={video.url}
          controls
          autoPlay
        />
        <VideoToolbar video={video} videoLinkTemplate={videoLinkTemplate} videos={navigationVideos} />
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