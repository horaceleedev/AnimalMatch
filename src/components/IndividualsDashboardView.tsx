import React, { useEffect, useMemo, useState } from 'react'
import { Splitter, Tabs, type TabsProps } from "antd";
import Icon from "@ant-design/icons";
import { formatQuery, RuleGroupType } from 'react-querybuilder';

import Table from '../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Map from '../assets/material_symbols/map_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import ViewList from '../assets/material_symbols/view_list_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import QueryOperationsButtons from './QueryOperationsButtons.tsx';
import IndividualsGridView from '../components/IndividualsGridView.tsx';
import BasicMapView from './BasicMapView.tsx';
import { getUniqueLocationsFromIndividuals } from '../utils/utils.ts';
import { Individual, MetadataFieldsType, Video } from '../types.ts';

const viewsTabsItems: TabsProps['items'] = [
  {
    key: 'list',
    label: 'Gallery view',
    icon: <Icon component={ViewList} />,
  },
  {
    key: 'table',
    label: 'Table view',
    icon: <Icon component={Table} />,
  },
  {
    key: 'map',
    label: 'Map view',
    icon: <Icon component={Map} />
  },
];
const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };

interface IndividualsDashboardViewProps {
  individuals: Individual[];
  videos: Video[];
  uniqueValuesPerField: Record<string, string[]>;
  individualsMetadataFields: MetadataFieldsType;
  onlyShowListView?: boolean;
  linkBase?: string;
  listViewButtons?: (individual: Individual) => JSX.Element;
  defaultGroupFields?: string[];
  defaultGroupOrders?: ("asc" | "desc")[];
}
const IndividualsDashboardView: React.FC<IndividualsDashboardViewProps> = ({
  individuals, videos, uniqueValuesPerField, individualsMetadataFields,
  onlyShowListView, linkBase, listViewButtons,
  defaultGroupFields, defaultGroupOrders,
}: IndividualsDashboardViewProps) => {
  const [view, setView] = useState(viewsTabsItems[0].key);

  if (!defaultGroupFields) defaultGroupFields = ['is_named'];
  if (!defaultGroupOrders) defaultGroupOrders = ['desc'];
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
    if (newQuery.rules.length > 0) {
      if (newQuery.rules[0].combinator) {
        alert('Groups not supported at the moment');
        return;
      }
    }
    _setQuery(newQuery);
  };
  const filteredIndividuals = useMemo(() => {
    return individuals.filter((individual) => {
      if (query.rules.length == 0) return true;
      return individual[query.rules[0].field] == query.rules[0].value;
    });
  }, [individuals,  query]);

  const uniqueLocations = useMemo(() => {
    return getUniqueLocationsFromIndividuals(filteredIndividuals, videos);
  }, [filteredIndividuals, videos]);

  return (
    <>
      <QueryOperationsButtons
        metadataFields={individualsMetadataFields} uniqueValuesPerField={uniqueValuesPerField}
        sortFields={sortFields} setSortFields={setSortFields} sortOrders={sortOrders} setSortOrders={setSortOrders}
        groupFields={groupFields} setGroupFields={setGroupFields} groupOrders={groupOrders} setGroupOrders={setGroupOrders}
        query={query} setQuery={setQuery}
      />
      {
        !onlyShowListView && 
        <Tabs defaultActiveKey="list" items={viewsTabsItems} onChange={setView} />
      }
      {
        (view === 'list') ? 
        <IndividualsGridView
          individuals={filteredIndividuals}
          individualsMetadataFields={individualsMetadataFields}
          linkBase={linkBase}
          buttons={listViewButtons}
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
          (uniqueLocations.length > 0) &&
          <Splitter>
            <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{height: 600, overflow: 'scroll', paddingRight: 12}}>
              <IndividualsGridView
                individuals={filteredIndividuals}
                individualsMetadataFields={individualsMetadataFields}
                linkBase={linkBase}
                buttons={listViewButtons}
                sortFields={sortFields}
                sortOrders={sortOrders}
                groupFields={groupFields}
                groupOrders={groupOrders}
              />
            </Splitter.Panel>
            <Splitter.Panel style={{paddingLeft: 12}}>
              <BasicMapView style={{height: 600, width: 800}} uniqueLocations={uniqueLocations} />
            </Splitter.Panel>
          </Splitter>
        )
      }
    </>
  );
};
export default IndividualsDashboardView;