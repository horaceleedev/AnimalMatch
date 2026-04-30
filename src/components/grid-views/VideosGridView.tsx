import { FC, MouseEvent, useCallback } from "react";
import { generatePath, Link } from "react-router-dom";
import { Card, Flex, Tag, Tooltip, Typography } from "antd";

import type { RecordSelectionUi } from "../../hooks/useRecordSelectionUi.ts";
import type { MetadataFieldsType, RecordType, Video } from "../../types.ts";
import withSortingGroupingAndPagination from "./withSortingGroupingAndPagination.tsx";
import "./VideosGridView.scss";

interface BasicVideosGridViewProps {
  videos: Video[];
  videoMetadataFields: MetadataFieldsType;
  isListView: boolean;
  selectionUi?: RecordSelectionUi;
  linkTemplate?: string;
  openModal?: (type: RecordType, id: string) => void;
  onSelectRecord?: () => void;
}

function playVideoPreview(event: MouseEvent<HTMLElement>) {
  event.currentTarget.querySelector("video")?.play();
}

function stopVideoPreview(event: MouseEvent<HTMLElement>) {
  event.currentTarget.querySelector("video")?.load();
}

const BasicVideosGridView: FC<BasicVideosGridViewProps> = ({
  videos,
  videoMetadataFields,
  isListView,
  selectionUi,
  linkTemplate = "/videos/:videoId",
  openModal,
  onSelectRecord,
}: BasicVideosGridViewProps) => {
  const selectionModeActive = selectionUi?.selectionModeActive ?? false;
  const selectedItems = selectionUi?.selectedItems ?? new Set<string>();

  const selectVideo = useCallback(
    (videoId: string) => (event: MouseEvent) => {
      event.preventDefault();
      selectionUi?.toggleItemSelection(videoId);
    },
    [selectionUi],
  );

  const openVideoModal = useCallback(
    (videoId: string) => (event: MouseEvent) => {
      onSelectRecord?.();
      if (!openModal) return;
      event.preventDefault();
      openModal("video", videoId);
    },
    [onSelectRecord, openModal],
  );

  return (
    <div className="gallery-view">
      <div className={isListView ? "videos-list " : "videos-grid"}>
        {videos.map((video) => (
          <Link
            key={video.id}
            to={generatePath(linkTemplate, { videoId: video.id })}
            onClick={(selectionModeActive ? selectVideo : openVideoModal)(video.id)}
          >
            <Card
              className={
                selectionModeActive && selectedItems.has(video.id) ? "selected" : ""
              }
              hoverable
              style={{ overflow: "hidden" }}
              styles={{ body: { padding: 0 } }}
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
    </div>
  );
};

const VideosGridView = withSortingGroupingAndPagination<
  BasicVideosGridViewProps,
  Video
>(BasicVideosGridView, {
  processedRecordsProp: "videos",
  metadataFieldsProp: "videoMetadataFields",
});

export default VideosGridView;
