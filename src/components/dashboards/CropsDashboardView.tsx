import React, { useMemo, useState } from 'react'
import { Tabs, type TabsProps } from "antd";
import Icon, { AppstoreOutlined } from "@ant-design/icons";
import { RuleGroupType, type RuleType } from 'react-querybuilder';

import Table from '../../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import QueryOperationsButtons from './QueryOperationsButtons.tsx';
import CropsGridView from '../grid-views/CropsGridView.tsx';
import { Crop, MetadataFieldsType, RecordType } from '../../types.ts';

const viewsTabsItems: TabsProps['items'] = [
  {
    key: 'grid',
    label: 'Grid view',
    icon: <AppstoreOutlined />,
  },
  {
    key: 'table',
    label: 'Table view',
    icon: <Icon component={Table} />,
  },
  // {
  //   key: 'map',
  //   label: 'Map view',
  //   icon: <Icon component={Map} />
  // },
];
const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };
const getFirstRule = (query: RuleGroupType): RuleType | undefined => {
  const firstRule = query.rules[0];
  if (!firstRule || 'rules' in firstRule) return undefined;
  return firstRule;
};

interface CropsDashboardViewProps {
  crops: Crop[];
  uniqueValuesPerField: Record<string, string[]>;
  cropsMetadataFields: MetadataFieldsType;
  onlyShowGridView?: boolean;
  linkTemplate?: string;
  // gridViewButtons?: (crop: Crop) => JSX.Element;
  defaultGroupFields?: string[];
  defaultGroupOrders?: ("asc" | "desc")[];
  openModal?: (type: RecordType , id: string) => void;
}
const CropsDashboardView: React.FC<CropsDashboardViewProps> = ({
  crops, uniqueValuesPerField, cropsMetadataFields,
  onlyShowGridView, linkTemplate, // gridViewButtons,
  defaultGroupFields, defaultGroupOrders,
  openModal,
}: CropsDashboardViewProps) => {
  const [view, setView] = useState(viewsTabsItems[0].key);

  if (!defaultGroupFields) defaultGroupFields = [];
  if (!defaultGroupOrders) defaultGroupOrders = [];
  const [sortFields, setSortFields] = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<("asc" | "desc")[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>(defaultGroupFields);
  const [groupOrders, setGroupOrders] = useState<("asc" | "desc")[]>(defaultGroupOrders);
  const [query, _setQuery] = useState(initialQuery);

  const setQuery = (newQuery: RuleGroupType) => {
    if (newQuery.rules.length > 1) {
      alert('Max 1 filter supported at the moment');
      return;
    }
    if (newQuery.rules.length > 0 && !getFirstRule(newQuery)) {
      alert('Groups not supported at the moment');
      return;
    }
    _setQuery(newQuery);
  };
  const filteredCrops = useMemo(() => {
    const firstRule = getFirstRule(query);
    return crops.filter((crop) => {
      if (!firstRule) return true;
      return crop[firstRule.field as keyof Crop] == firstRule.value;
    });
  }, [crops, query]);

  return (
    <>
      <QueryOperationsButtons
        metadataFields={cropsMetadataFields} uniqueValuesPerField={uniqueValuesPerField}
        sortFields={sortFields} setSortFields={setSortFields} sortOrders={sortOrders} setSortOrders={setSortOrders}
        groupFields={groupFields} setGroupFields={setGroupFields} groupOrders={groupOrders} setGroupOrders={setGroupOrders}
        query={query} setQuery={setQuery}
      />
      {
        !onlyShowGridView && 
        <Tabs defaultActiveKey="grid" items={viewsTabsItems} onChange={setView} />
      }
      {
        (view === 'grid') ? 
        <CropsGridView
          crops={filteredCrops}
          cropsMetadataFields={cropsMetadataFields}
          linkTemplate={linkTemplate}
          // buttons={gridViewButtons}
          openModal={openModal}
          sortFields={sortFields}
          sortOrders={sortOrders}
          groupFields={groupFields}
          groupOrders={groupOrders}
        />
        :
        (
          (view === 'table') ?
          <p>Not implemented yet</p>
          :
          <p>Unsupported view</p>
        )
      }
    </>
  );
};
export default CropsDashboardView;
