import { FC, useMemo, useState } from "react";
import { Layout, Menu, Typography } from "antd";
import Icon, { TagOutlined, UserOutlined } from "@ant-design/icons";
const { Sider } = Layout;
import CropIcon from "../../assets/material_symbols/crop_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";

import { MetadataFieldsType, UserRecord, Crop } from "../../types";
import "./DashboardSider.scss";

export const useCropsDashboardSiderState = (crops: Crop[], _cropsMetadataFields: MetadataFieldsType, user: UserRecord | null) => {
  const [selectedSiderKey, setSelectedSiderKey] = useState("all-crops");
  const cropsBySiderKey: Record<string, Crop[]> = useMemo(() => ({
    "all-crops": crops,
    "created-by-me": user ? crops.filter(crop => crop.created_by === user.id) : [],
    // // body parts
    // ...cropsMetadataFields['body_part'].presetOptions!.reduce((acc: Record<string, Crop[]>, body_part: string) => {
    //   acc['body_part/'+body_part] = crops.filter(crop => crop.body_part === body_part);
    //   return acc;
    // }, {}),
    // custom tags
    ...crops.reduce((acc: Record<string, Crop[]>, cur: Crop) => {
      for (const tag of cur.custom_tags) {
        const tagWithPrefix = "custom-tags/" + tag;
        if (!(tagWithPrefix in acc)) acc[tagWithPrefix] = [];
        acc[tagWithPrefix].push(cur);
      }
      return acc;
    }, {}),
  }), [crops, user]);
  const cropsFiltered = useMemo(() => 
    cropsBySiderKey[selectedSiderKey],
    [cropsBySiderKey, selectedSiderKey]
  );
  return [selectedSiderKey, setSelectedSiderKey, cropsBySiderKey, cropsFiltered] as const;
};

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
          //     label: <Typography.Text ellipsis={{tooltip: body_part}}>{body_part}</Typography.Text>,
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
                label: <Typography.Text ellipsis={{tooltip: x}}>{x}</Typography.Text>,
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
