import React, { useMemo } from 'react'
import { generatePath, Link } from "react-router-dom";
import { Card, Collapse, Flex, Tag, Tooltip, Typography } from "antd";
import { groupBy, orderBy } from "es-toolkit";


import type { RecordType, Video } from "../types.ts";
import type { MetadataFieldsType } from "../types.tsx";
import "./VideosGridView.scss"

interface BasicVideosGridViewProps {
  videos: Video[];
  videoMetadataFields: MetadataFieldsType;
  isListView: boolean;
  linkTemplate?: string;
  openModal?: (type: RecordType , id: string) => void;
};

// Basic video grid view (without grouping and sorting)
const BasicVideosGridView: React.FC<BasicVideosGridViewProps> = ({
  videos, videoMetadataFields, isListView, linkTemplate = "/videos/:videoId", openModal,
}: BasicVideosGridViewProps) => {
  return (
    <div className={isListView ? "videos-list " : "videos-grid"}>
      {
        videos.map((video: Video) => (
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
            onClick={(e) => {
              if (!openModal) return;
              e.preventDefault();
              openModal("video", video.id);
            }}
          >
            <Card
              hoverable
              style={{ overflow: 'hidden' }}
              styles={{ body: { padding: 0 } }}
            >
              <Flex vertical={!isListView} justify={isListView ? "flex-start" : "space-between"}>
                <video src={video.url}
                        controls
                />
                <Flex vertical align="flex-start" justify="space-between" style={{ padding: 12 }}>
                  <Typography.Title level={5} style={{marginTop: 0, fontSize: 14}}>{video.filename}</Typography.Title>
                  <Flex wrap gap={4}>
                    {
                      ['location_name', 'month_of_SD_retrieval', 'habitat', 'recording_date'].map(field => (
                        <Tooltip title={videoMetadataFields[field].displayName} key={field}>
                          <Tag icon={videoMetadataFields[field].icon}>
                            {video[field]}
                          </Tag>
                        </Tooltip>
                      ))
                    }
                  </Flex>
                </Flex>
              </Flex>
            </Card>
          </Link>
        ))
      }
    </div>
  );
};

interface VideosGridViewProps extends BasicVideosGridViewProps {
  sortFields: string[];
  sortOrders: ("asc" | "desc")[];
  groupFields: string[];
  groupOrders: ("asc" | "desc")[];
};

const VideosGridView: React.FC<VideosGridViewProps> = ({
  videos, videoMetadataFields, isListView, linkTemplate, sortFields, sortOrders, groupFields, groupOrders, openModal
}: VideosGridViewProps) => {
  const videosSorted = orderBy(videos, sortFields, sortOrders);
  
  // TODO check if the below works when groupFields.length === 0
  const groupedVideos: [any, Video[]][] = useMemo(() => (
    orderBy(
      Object.entries(groupBy<Video, any>(videosSorted, v => v[groupFields[0]])),
      [([groupValue, _]) => groupValue],
      [groupOrders[0]]
    )
  ), [videosSorted]);

  if (groupFields.length === 0) return (
    <BasicVideosGridView
      videos={videosSorted}
      videoMetadataFields={videoMetadataFields}
      isListView={isListView}
      linkTemplate={linkTemplate}
      openModal={openModal}
    />
  );

  return groupedVideos.map(([groupValue, groupVideos]) => (
    <Collapse
      key={groupValue}
      collapsible="header"
      defaultActiveKey={['1']}
      style={{
        marginBottom: 12
      }}
      items={[
        {
          key: '1',
          label: <span>{videoMetadataFields[groupFields[0]].displayName}: {groupValue}</span>,
          children: (
            <BasicVideosGridView
              videos={groupVideos}
              videoMetadataFields={videoMetadataFields}
              isListView={isListView}
              linkTemplate={linkTemplate}
              openModal={openModal}
            />
          ),
        },
      ]}
      // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      // style={{ background: token.colorBgContainer }}
    />
  ));
};

export default VideosGridView;