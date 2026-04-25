import { FC, useMemo, useState } from "react";
import { Layout, Menu, Typography } from "antd";
import Icon, { CheckOutlined, ExclamationCircleOutlined, IdcardOutlined, QuestionOutlined, TagOutlined, UserOutlined } from "@ant-design/icons";
const { Sider } = Layout;

import FamilyGroup from "../../assets/material_symbols/family_group_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";
import GroupWork from "../../assets/material_symbols/group_work_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";

import { MetadataFieldsType, UserRecord, Individual } from "../../types";
import "./DashboardSider.scss";

export const useIndividualsDashboardSiderState = (individuals: Individual[], individualsMetadataFields: MetadataFieldsType, user: UserRecord | null) => {
  const [selectedSiderKey, setSelectedSiderKey] = useState("all-individuals");
  const individualsBySiderKey: Record<string, Individual[]> = useMemo(() => ({
    "all-individuals": individuals,
    "created-by-me": user ? individuals.filter(individual => individual.created_by === user.id) : [],
    // by identification status
    "is_identified": individuals.filter(individual => individual.is_identified === true),
    "is_not_identified": individuals.filter(individual => individual.is_identified === false),
    // ages
    ...individualsMetadataFields['age'].presetOptions!.reduce((acc: Record<string, Individual[]>, age: string) => {
      acc['age/'+age] = individuals.filter(individual => individual.age === age);
      return acc;
    }, {}),
    // sexes
    ...individualsMetadataFields['sex'].presetOptions!.reduce((acc: Record<string, Individual[]>, sex: string) => {
      acc['sex/'+sex] = individuals.filter(individual => individual.sex === sex);
      return acc;
    }, {}),
    // family groups
    ...individuals.reduce((acc: Record<string, Individual[]>, cur: Individual) => {
      const key = 'family_group/' + cur.family_group;
      if (!(key in acc)) acc[key] = [];
      acc[key].push(cur);
      return acc;
    }, {}),
     // bond groups
     ...individuals.reduce((acc: Record<string, Individual[]>, cur: Individual) => {
      const key = 'bond_group/' + cur.bond_group;
      if (!(key in acc)) acc[key] = [];
      acc[key].push(cur);
      return acc;
     }, {}),
    // issues
    "has-issues": individuals.filter(individual => individual.issues && individual.issues.trim() !== ""),
    // custom tags
    ...individuals.reduce((acc: Record<string, Individual[]>, cur: Individual) => {
      for (const tag of cur.custom_tags) {
        const tagWithPrefix = "custom-tags/" + tag;
        if (!(tagWithPrefix in acc)) acc[tagWithPrefix] = [];
        acc[tagWithPrefix].push(cur);
      }
      return acc;
    }, {}),
  }), [individuals, user]);
  const individualsFiltered = useMemo(() => 
    individualsBySiderKey[selectedSiderKey],
    [individualsBySiderKey, selectedSiderKey]
  );
  return [selectedSiderKey, setSelectedSiderKey, individualsBySiderKey, individualsFiltered] as const;
};

interface IndividualsDashboardSiderProps {
  selectedSiderKey: string;
  setSelectedSiderKey: (key: string) => void;
  individualsBySiderKey: Record<string, Individual[]>;
  individualsMetadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
}
export const IndividualsDashboardSider: FC<IndividualsDashboardSiderProps> = ({
  selectedSiderKey, setSelectedSiderKey, individualsBySiderKey, individualsMetadataFields, uniqueValuesPerField,
}) => {
  return (
    <Sider className="dashboard-sider" style={{ /* background: colorBgContainer */ }} width={220}>
      <h3>Individuals</h3>
      <Menu
        mode="inline"
        selectedKeys={[selectedSiderKey]}
        className="dashboard-sider-menu"
        items={[
          {
            key: 'all-individuals',
            label: 'All individuals',
            icon: <IdcardOutlined />,
            extra: individualsBySiderKey['all-individuals'].length,
          },
          {
            key: 'created-by-me',
            label: 'Created by me',
            icon: <UserOutlined />,
            extra: individualsBySiderKey['created-by-me'].length,
          },
          // {
          //   key: 'recently-added',
          //   label: 'Recently added',
          // },
          (
            // Only show if is_identified field is available
            individualsMetadataFields['is_identified'] ?
            {
              key: 'by-identification-status',
              label: 'By identification status',
              type: 'group',
              children: [
                {
                  key: 'is_identified',
                  label: individualsMetadataFields['is_identified'].displayBooleanValuesAs?.[1] ?? 'Identified',
                  icon: <CheckOutlined />,
                  extra: individualsBySiderKey['is_identified'].length,
                },
                {
                  key: 'is_not_identified',
                  label: individualsMetadataFields['is_identified'].displayBooleanValuesAs?.[0] ?? 'Not identified',
                  icon: <QuestionOutlined />,
                  extra: individualsBySiderKey['is_not_identified'].length,
                },
              ],
            }
            :
            null
          ),
          {
            key: 'by-age-sex',
            label: 'By age and sex',
            type: 'group',
            children: [
              {
                key: 'by-age',
                label: 'By age',
                icon: individualsMetadataFields['age'].icon,
                children: individualsMetadataFields['age'].presetOptions!.map(age => ({
                  key: 'age/'+age,
                  label: age,
                  extra: individualsBySiderKey['age/'+age].length,
                })),
              },
              {
                key: 'by-sex',
                label: 'By sex',
                icon: individualsMetadataFields['sex'].icon,
                children: individualsMetadataFields['sex'].presetOptions!.map(sex => ({
                  key: 'sex/'+sex,
                  label: sex,
                  extra: individualsBySiderKey['sex/'+sex].length,
                })),
              },
            ],
          },
          {
            key: 'by-family-bond-group',
            label: 'By family/bond group',
            type: 'group',
            children: [
              {
                key: 'by-family-group',
                label: 'By family group',
                icon: <Icon component={FamilyGroup} />,
                children: (uniqueValuesPerField['family_group'] || []).map(group => ({
                  key: 'family_group/' + group,
                  label: group || "No family group",
                  extra: individualsBySiderKey['family_group/' + group].length,
                })),
              },
              {
                key: 'by-bond-group',
                label: 'By bond group',
                icon: <Icon component={GroupWork} />,
                children: (uniqueValuesPerField['bond_group'] || []).map(group => ({
                  key: 'bond_group/' + group,
                  label: <Typography.Text ellipsis={{tooltip: true}}>{group || "No bond group"}</Typography.Text>,
                  extra: individualsBySiderKey['bond_group/' + group].length,
                })),
              },
            ],
          },
          {
            key: 'other',
            label: 'Other',
            type: 'group',
            children: [
              {
                key: 'has-issues',
                label: 'Has issues',
                icon: <ExclamationCircleOutlined />,
                extra: individualsBySiderKey['has-issues'].length,
              },
            ],
          },
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
                extra: individualsBySiderKey['custom-tags/'+x].length,
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
