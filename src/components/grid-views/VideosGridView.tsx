import { FC, MouseEvent, useCallback } from "react";
import { generatePath, Link } from "react-router-dom";
import { Card, Flex, Tag, Tooltip, Typography } from "antd";

import type { RecordType, Video } from "../../types.ts";
import type { MetadataFieldsType } from "../../types.ts";
import withSortingGroupingAndPagination from './withSortingGroupingAndPagination.tsx';
import "./VideosGridView.scss"
import { useSelectionStore } from "../../hooks/useSelectionStore.ts";

interface BasicVideosGridViewProps {
  videos: Video[];
  videoMetadataFields: MetadataFieldsType;
  isListView: boolean;
  linkTemplate?: string;
  openModal?: (type: RecordType , id: string) => void;
  onSelectRecord?: () => void;
};

function playVideoPreview(event: MouseEvent<HTMLElement>) {
  event.currentTarget.querySelector('video')?.play();
}

function stopVideoPreview(event: MouseEvent<HTMLElement>) {
  event.currentTarget.querySelector('video')?.load();
}

// Basic video grid view (without grouping and sorting)
const BasicVideosGridView: FC<BasicVideosGridViewProps> = ({
  videos,
  videoMetadataFields,
  isListView,
  linkTemplate = "/videos/:videoId",
  openModal,
  onSelectRecord,
}: BasicVideosGridViewProps) => {
  const { selectionMode, selectedItems, toggleItemSelection } = useSelectionStore();
  const selectVideo = useCallback((videoId: string) => (e: MouseEvent) => {
    e.preventDefault();
    toggleItemSelection(videoId);
  }, [toggleItemSelection]);

  const openVideoModal = useCallback((videoId: string) => (e: MouseEvent) => {
    onSelectRecord?.();
    if (!openModal) return;
    e.preventDefault();
    openModal("video", videoId);
  }, [openModal, onSelectRecord]);

  const onClickVideo = selectionMode ? selectVideo : openVideoModal;

  return (
    <div className={isListView ? "videos-list " : "videos-grid"}>
      {videos.map((video: Video) => (
        // Old version:
        // <Link key={video.id} to={"/videos/" + video.id}>
        //   <Card
        //     hoverable
        //     size="small"
        //     cover={<video src={video.url} width="300px" controls />}
        //   >
        //     <Card.Meta
        //       title={video.filename}
        //       description={
        //         <Flex wrap gap={4}>
        //           {
        //             ['location_name', 'month_of_SD_retrieval', 'habitat', 'recording_date'].map(field => (
        //               <Tooltip title={videoMetadataFields[field].displayName} key={field}>
        //                 <Tag icon={videoMetadataFields[field].icon}>
        //                   {video[field]}
        //                 </Tag>
        //               </Tooltip>
        //             ))
        //           }
        //         </Flex>
        //       }
        //     />
        //   </Card>
        // </Link>

        // New version:
        <Link
          key={video.id}
          to={generatePath(linkTemplate, { videoId: video.id })}
          onClick={onClickVideo(video.id)}
        >
          <Card
            className={
              selectionMode && selectedItems.has(video.id)
                ? "selected"
                : ""
            }
            hoverable
            style={{ overflow: "hidden" }}
            styles={{ body: { padding: 0 } }}
            // video hover preview
            onMouseEnter={playVideoPreview}
            onMouseLeave={stopVideoPreview}
          >
            <Flex
              vertical={!isListView}
              justify={isListView ? "flex-start" : "space-between"}
            >
              <video
                src={video.url}
                poster={video.thumbnailUrl}
                playsInline
                muted
                preload="none"
              />
              <Flex
                vertical
                align="flex-start"
                justify="space-between"
                style={{ padding: 12 }}
              >
                <Typography.Title
                  level={5}
                  className="video-title"
                  ellipsis={{ tooltip: true }}
                >
                  {video.filename}
                </Typography.Title>
                <Flex wrap gap={4}>
                  {[
                    "location_name",
                    "month_of_SD_retrieval",
                    "habitat",
                    "recording_date",
                  ].map((field) => (
                    <Tooltip
                      title={videoMetadataFields[field].displayName}
                      key={field}
                    >
                      <Tag icon={videoMetadataFields[field].icon}>
                        {video[field]}
                      </Tag>
                    </Tooltip>
                  ))}
                </Flex>
              </Flex>
            </Flex>
          </Card>
        </Link>
      ))}
    </div>
  );
};

const VideosGridView = withSortingGroupingAndPagination<BasicVideosGridViewProps, Video>(
  BasicVideosGridView,
  { processedRecordsProp: 'videos', metadataFieldsProp: 'videoMetadataFields' }
);

export default VideosGridView;