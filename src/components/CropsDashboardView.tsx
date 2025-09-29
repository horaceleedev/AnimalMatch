import React, { useMemo, useState } from 'react'
import { Tabs, type TabsProps } from "antd";
import Icon, { AppstoreOutlined } from "@ant-design/icons";
import { RuleGroupType } from 'react-querybuilder';

import Table from '../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import QueryOperationsButtons from './QueryOperationsButtons.tsx';
import CropsGridView from '../components/CropsGridView.tsx';
import { Crop, MetadataFieldsType } from '../types.ts';

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

interface CropsDashboardViewProps {
  crops: Crop[];
  uniqueValuesPerField: Record<string, string[]>;
  cropsMetadataFields: MetadataFieldsType;
  onlyShowGridView?: boolean;
  linkBase?: string;
  // gridViewButtons?: (crop: Crop) => JSX.Element;
  defaultGroupFields?: string[];
  defaultGroupOrders?: ("asc" | "desc")[];
}
const CropsDashboardView: React.FC<CropsDashboardViewProps> = ({
  crops, uniqueValuesPerField, cropsMetadataFields,
  onlyShowGridView, linkBase, // gridViewButtons,
  defaultGroupFields, defaultGroupOrders,
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
    alert('Not implemented');
  };
  const filteredCrops = useMemo(() => {
    return crops.filter((crop) => {
      if (query.rules.length == 0) return true;
      return crop[query.rules[0].field] == query.rules[0].value;
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
          linkBase={linkBase}
          // buttons={gridViewButtons}
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