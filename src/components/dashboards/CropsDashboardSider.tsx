import { FC } from "react";
import { Layout, Menu, Typography } from "antd";
import Icon, { TagOutlined, UserOutlined } from "@ant-design/icons";
const { Sider } = Layout;
import CropIcon from "../../assets/material_symbols/crop_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";

import { MetadataFieldsType, Crop } from "../../types";
import "./DashboardSider.scss";

interface CropsDashboardSiderProps {
  selectedSiderKey: string;
  setSelectedSiderKey: (key: string) => void;
  cropsBySiderKey: Record<string, Crop[]>;
  cropsMetadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
}
export const CropsDashboardSider: FC<CropsDashboardSiderProps> = ({
  selectedSiderKey, setSelectedSiderKey, cropsBySiderKey, cropsMetadataFields: _cropsMetadataFields, uniqueValuesPerField,
}) => {
  return (
    <Sider className="dashboard-sider" style={{ /* background: colorBgContainer */ }} width={220}>
      <h3>Crops</h3>
      <Menu
        mode="inline"
        selectedKeys={[selectedSiderKey]}
        className="dashboard-sider-menu"
        items={[
          {
            key: 'all-crops',
            label: 'All crops',
            icon: <Icon component={CropIcon} />,
            extra: cropsBySiderKey['all-crops'].length,
          },
          {
            key: 'created-by-me',
            label: 'Created by me',
            icon: <UserOutlined />,
            extra: cropsBySiderKey['created-by-me'].length,
          },
          // {
          //   key: 'recently-added',
          //   label: 'Recently added',
          // },
          // {
          //   key: 'by-body-part',
          //   label: 'By body part',
          //   type: 'group',
          //   children: cropsMetadataFields['body_part'].presetOptions!.map(body_part => ({
          //     key: 'body_part/'+body_part,
          //     label: <Typography.Text ellipsis={{tooltip: true}}>{body_part}</Typography.Text>,
          //     extra: cropsBySiderKey['body_part/'+body_part].length,
          //   })),
          // },
          (
            uniqueValuesPerField['custom_tags']?.length ?
            {
              key: 'custom-tags',
              label: 'Custom tags',
              type: 'group',
              children: uniqueValuesPerField['custom_tags'].map(x => ({
                key: 'custom-tags/'+x,
                label: <Typography.Text ellipsis={{tooltip: true}}>{x}</Typography.Text>,
                icon: <TagOutlined />,
                extra: cropsBySiderKey['custom-tags/'+x].length,
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
