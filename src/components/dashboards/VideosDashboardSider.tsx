import { FC, useMemo, useState } from "react";
import { Layout, Menu, Typography } from "antd";
import { PlaySquareOutlined, TagOutlined, UserOutlined } from "@ant-design/icons";
const { Sider } = Layout;

import AnnotationStatusLabel from "../misc/AnnotationStatusLabel";
import { MetadataFieldsType, UserRecord, Video } from "../../types";
import "./DashboardSider.scss";

export const useVideosDashboardSiderState = (videos: Video[], videoMetadataFields: MetadataFieldsType, user: UserRecord | null) => {
  const [selectedSiderKey, setSelectedSiderKey] = useState("all-videos");
  const videosBySiderKey: Record<string, Video[]> = useMemo(() => ({
    "all-videos": videos,
    "assigned-to-me": user ? videos.filter(video => video.assignees.includes(user.id)) : [],
    // annotation statuses
    ...videoMetadataFields['annotation_status'].presetOptions!.reduce((acc: Record<string, Video[]>, status: string) => {
      acc[status] = videos.filter(video => video.annotation_status === status);
      return acc;
    }, {}),
    // custom tags
    ...videos.reduce((acc: Record<string, Video[]>, cur: Video) => {
      for (const tag of cur.custom_tags) {
        const tagWithPrefix = "custom-tags/" + tag;
        if (!(tagWithPrefix in acc)) acc[tagWithPrefix] = [];
        acc[tagWithPrefix].push(cur);
      }
      return acc;
    }, {}),
  }), [videos, user]);
  const videosFiltered = useMemo(() => 
    videosBySiderKey[selectedSiderKey],
    [videosBySiderKey, selectedSiderKey]
  );
  return [selectedSiderKey, setSelectedSiderKey, videosBySiderKey, videosFiltered] as const;
};

interface VideosDashboardSiderProps {
  selectedSiderKey: string;
  setSelectedSiderKey: (key: string) => void;
  videosBySiderKey: Record<string, Video[]>;
  videoMetadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
}
export const VideosDashboardSider: FC<VideosDashboardSiderProps> = ({
  selectedSiderKey, setSelectedSiderKey, videosBySiderKey, videoMetadataFields, uniqueValuesPerField,
}) => {
  return (
    <Sider className="dashboard-sider" style={{ /* background: colorBgContainer */ }} width={220}>
      <h3>Videos</h3>
      <Menu
        mode="inline"
        selectedKeys={[selectedSiderKey]}
        className="dashboard-sider-menu"
        items={[
          {
            key: 'all-videos',
            label: 'All videos',
            icon: <PlaySquareOutlined />,
            extra: videosBySiderKey['all-videos'].length,
            // children: (uniqueValuesPerField['location_name'] ?? []).map(x => ({key: x, label: x, icon: <FolderOutlined />})),
          },
          {
            key: 'assigned-to-me',
            label: 'Assigned to me',
            icon: <UserOutlined />,
            extra: videosBySiderKey['assigned-to-me'].length,
          },
          // {
          //   key: 'recently-added',
          //   label: 'Recently added',
          // },
          // {
          //   key: 'folders',
          //   label: 'Folders',
          //   type: 'group',
          //   children: uniqueValuesPerField['location_name'].map(x => ({key: x, label: x, icon: <FolderOutlined />})),
          // },
          {
            key: 'by-annotation-status',
            label: 'By annotation status',
            type: 'group',
            children: videoMetadataFields['annotation_status'].presetOptions!.map(status => ({
              key: status,
              label: <AnnotationStatusLabel status={status} largeSize />,
              extra: videosBySiderKey[status].length,
            })),
          },
          (
            uniqueValuesPerField['custom_tags']?.length ?
            {
              key: 'custom-tags',
              label: 'Custom tags',
              type: 'group',
              children: uniqueValuesPerField['custom_tags'].map(x => ({
                key: 'custom-tags/'+x,
                label: <Typography.Text ellipsis={{tooltip: x}}>{x}</Typography.Text>,
                icon: <TagOutlined />,
                extra: videosBySiderKey['custom-tags/'+x].length,
              })),
            }
            :
            null
          ),
        ]}
        onClick={({key}: {key: string}) => setSelectedSiderKey(key)}
      />
    </Sider>
  );
};