import { FC } from "react";
import { Layout, Menu, Typography } from "antd";
import { PlaySquareOutlined, TagOutlined, UserOutlined } from "@ant-design/icons";
const { Sider } = Layout;

import AnnotationStatusLabel from "../ui/AnnotationStatusLabel";
import { MetadataFieldsType, Video } from "../../types";
import "./DashboardSider.scss";

interface VideosDashboardSiderProps {
  selectedSiderKey: string;
  videosBySiderKey: Record<string, Video[]>;
  videoMetadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
  onChange?: (info: { key: string }) => void;
}
export const VideosDashboardSider: FC<VideosDashboardSiderProps> = ({
  selectedSiderKey,
  videosBySiderKey,
  videoMetadataFields,
  uniqueValuesPerField,
  onChange,
}) => {
  function onClick({ key }: { key: string }) {
    onChange?.({ key });
  }

  return (
    <Sider
      className="dashboard-sider"
      style={{ /* background: colorBgContainer */ }}
      width={220}
    >
      <h3>Videos</h3>
      <Menu
        mode="inline"
        selectedKeys={[selectedSiderKey]}
        className="dashboard-sider-menu"
        items={[
          {
            key: "all-videos",
            label: "All videos",
            icon: <PlaySquareOutlined />,
            extra: videosBySiderKey["all-videos"].length,
            // children: (uniqueValuesPerField['location_name'] ?? []).map(x => ({key: x, label: x, icon: <FolderOutlined />})),
          },
          {
            key: "assigned-to-me",
            label: "Assigned to me",
            icon: <UserOutlined />,
            extra: videosBySiderKey["assigned-to-me"].length,
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
            key: "by-annotation-status",
            label: "By annotation status",
            type: "group",
            children: videoMetadataFields[
              "annotation_status"
            ].presetOptions!.map((status) => ({
              key: status,
              label: <AnnotationStatusLabel status={status} largeSize />,
              extra: videosBySiderKey[status].length,
            })),
          },
          uniqueValuesPerField["custom_tags"]?.length
            ? {
                key: "custom-tags",
                label: "Custom tags",
                type: "group",
                children: uniqueValuesPerField["custom_tags"].map((x) => ({
                  key: "custom-tags/" + x,
                  label: (
                    <Typography.Text ellipsis={{ tooltip: true }}>
                      {x}
                    </Typography.Text>
                  ),
                  icon: <TagOutlined />,
                  extra: videosBySiderKey["custom-tags/" + x].length,
                })),
              }
            : null,
        ]}
        onClick={onClick}
      />
    </Sider>
  );
};