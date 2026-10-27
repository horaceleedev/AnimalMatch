import React, { useMemo, useState } from 'react'
import { Splitter, Tabs, Typography, type TabsProps } from "antd";
import Icon from "@ant-design/icons";
import { RuleGroupType } from 'react-querybuilder';

import Table from '../../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Map from '../../assets/material_symbols/map_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import ViewList from '../../assets/material_symbols/view_list_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import QueryOperationsButtons from './QueryOperationsButtons.tsx';
import IndividualsGridView from '../grid-views/IndividualsGridView.tsx';
import IndividualsTableView from '../table-views/IndividualsTableView.tsx';
import BasicMapView from '../ui/BasicMapView.tsx';
import BodyPartSelect from '../ui/BodyPartSelect.tsx';
import { filterIndividualsByBodyPart, getAvailableBodyParts } from '../../utils/bodyPartFilters.ts';
import { getUniqueLocationsFromIndividuals } from '../../utils/utils.ts';
import { filterByQuery } from '../../lib/filtering/filterEngine.ts';
import useSearchFilter from '../../hooks/useSearchFilter.ts';
import { Individual, MetadataFieldsType, Video } from '../../types.ts';

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
  bodyPartOptions: string[];
  individualsMetadataFields: MetadataFieldsType;
  onlyShowListView?: boolean;
  listDescription?: string;
  linkTemplate?: string;
  listViewButtons?: (individual: Individual) => JSX.Element;
  defaultGroupFields?: string[];
  defaultGroupOrders?: ("asc" | "desc")[];
}
const IndividualsDashboardView: React.FC<IndividualsDashboardViewProps> = ({
  individuals, videos, uniqueValuesPerField, bodyPartOptions, individualsMetadataFields,
  onlyShowListView, listDescription, linkTemplate, listViewButtons,
  defaultGroupFields, defaultGroupOrders,
}: IndividualsDashboardViewProps) => {
  const [view, setView] = useState(viewsTabsItems[0].key);

  if (!defaultGroupFields) defaultGroupFields = [];
  if (!defaultGroupOrders) defaultGroupOrders = [];
  const [sortFields, setSortFields] = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<("asc" | "desc")[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>(defaultGroupFields);
  const [groupOrders, setGroupOrders] = useState<("asc" | "desc")[]>(defaultGroupOrders);

  const [query, setQuery] = useState(initialQuery);
  const filteredIndividuals = useMemo(() => {
    return filterByQuery(individuals, query);
  }, [individuals, query]);
  const { filteredRecords: searchFilteredIndividuals, setSearchQuery } = useSearchFilter(
    filteredIndividuals,
    individualsMetadataFields,
  );

  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const availableBodyParts = useMemo(
    () => getAvailableBodyParts(individuals.flatMap(individual => individual.crops)),
    [individuals]
  );
  const visibleIndividuals = useMemo(
    () => filterIndividualsByBodyPart(searchFilteredIndividuals, selectedBodyPart),
    [searchFilteredIndividuals, selectedBodyPart]
  );
  const hiddenCount = searchFilteredIndividuals.length - visibleIndividuals.length;
  const hiddenMessage = selectedBodyPart && hiddenCount > 0
    ? `${hiddenCount} individuals are hidden because they have no crops matching "${selectedBodyPart}"`
    : '';
  const description = [listDescription, hiddenMessage].filter(Boolean).join(' ');

  const uniqueLocations = useMemo(() => {
    return getUniqueLocationsFromIndividuals(visibleIndividuals, videos);
  }, [visibleIndividuals, videos]);

  const bodyPartSelect = (
    <BodyPartSelect
      bodyPartOptions={bodyPartOptions}
      selectedBodyPart={selectedBodyPart}
      setSelectedBodyPart={setSelectedBodyPart}
      availableBodyParts={availableBodyParts}
    />
  );

  return (
    <>
      <QueryOperationsButtons
        metadataFields={individualsMetadataFields} uniqueValuesPerField={uniqueValuesPerField}
        sortFields={sortFields} setSortFields={setSortFields} sortOrders={sortOrders} setSortOrders={setSortOrders}
        groupFields={groupFields} setGroupFields={setGroupFields} groupOrders={groupOrders} setGroupOrders={setGroupOrders}
        query={query} setQuery={setQuery}
        handleSearch={setSearchQuery}
      />
      {
        onlyShowListView
          ? bodyPartSelect
          : <Tabs
              defaultActiveKey="list"
              items={viewsTabsItems}
              onChange={setView}
              tabBarExtraContent={{ right: bodyPartSelect }}
            />
      }
      {
        description &&
        <Typography.Paragraph type="secondary" style={{marginBottom: 8}}>{description}</Typography.Paragraph>
      }
      {
        (view === 'list') ?
        <IndividualsGridView
          individuals={visibleIndividuals}
          individualsMetadataFields={individualsMetadataFields}
          linkTemplate={linkTemplate}
          buttons={listViewButtons}
          sortFields={sortFields}
          sortOrders={sortOrders}
          groupFields={groupFields}
          groupOrders={groupOrders}
          cropBodyPart={selectedBodyPart}
        />
        :
        (
          (view === 'table') ?
          <IndividualsTableView
            individuals={searchFilteredIndividuals}
            individualsMetadataFields={individualsMetadataFields}
            linkTemplate={linkTemplate}
          />
          :
          (uniqueLocations.length > 0) &&
          <Splitter>
            <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{height: 600, overflow: 'scroll', paddingRight: 12}}>
              <IndividualsGridView
                individuals={visibleIndividuals}
                individualsMetadataFields={individualsMetadataFields}
                linkTemplate={linkTemplate}
                buttons={listViewButtons}
                sortFields={sortFields}
                sortOrders={sortOrders}
                groupFields={groupFields}
                groupOrders={groupOrders}
                cropBodyPart={selectedBodyPart}
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
