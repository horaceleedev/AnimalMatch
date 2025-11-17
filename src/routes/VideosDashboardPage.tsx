import React, { useState } from 'react';
import { Outlet } from "react-router-dom";
import { Splitter, Tabs } from "antd";
import type { TabsProps } from 'antd';
import Icon, { AppstoreOutlined } from "@ant-design/icons";
import { RevoGrid } from '@revolist/react-datagrid';
import { RuleGroupType } from 'react-querybuilder';

import "./VideosDashboardPage.scss";
import Table from '../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Map from '../assets/material_symbols/map_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import { gridEditors, tableColumns, videoMetadataFields } from "../metadata.tsx";
import VideosGridView from "../components/VideosGridView.tsx";
import QueryOperationsButtons from "../components/QueryOperationsButtons.tsx";
import { useVideoStore } from "../DataStores.tsx";
import BasicMapView from '../components/BasicMapView.tsx';

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
  {
    key: 'map',
    label: 'Map view',
    icon: <Icon component={Map} />
  },
];
const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };

const VideosDashboardPage: React.FC = () => {
  const [view, setView] = useState(viewsTabsItems[0].key);
  const videos = useVideoStore((state) => state.processedRecords);
  const uniqueLocations = useVideoStore((state) => state.extra.uniqueLocations);
  const uniqueValuesPerField = useVideoStore((state) => state.uniqueValuesPerField);

  const [sortFields, setSortFields] = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<("asc" | "desc")[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [groupOrders, setGroupOrders] = useState<("asc" | "desc")[]>([]);
  const [query, _setQuery] = useState(initialQuery);
  const setQuery = () => {
    alert('Not implemented');
  }
  
  return (
    <>
      <QueryOperationsButtons
        metadataFields={videoMetadataFields} uniqueValuesPerField={uniqueValuesPerField}
        sortFields={sortFields} setSortFields={setSortFields} sortOrders={sortOrders} setSortOrders={setSortOrders}
        groupFields={groupFields} setGroupFields={setGroupFields} groupOrders={groupOrders} setGroupOrders={setGroupOrders}
        query={query} setQuery={setQuery}
      />

      <Tabs defaultActiveKey="grid" items={viewsTabsItems} onChange={setView} />

      {
        (view === 'grid') ? 
          <VideosGridView
            processedRecords={videos}
            metadataFields={videoMetadataFields}
            processedRecordsPropName="videos"
            basicGridViewProps={{
              videos,
              videoMetadataFields,
              isListView: false,
            }}
            sortFields={sortFields} 
            sortOrders={sortOrders} 
            groupFields={groupFields} 
            groupOrders={groupOrders}
          />
        :
        (
          (view === 'table') ?
          <RevoGrid columns={tableColumns} source={videos} rowHeaders={true} resize={true} autoSizeColumn={true} range={true} readonly={true} editors={gridEditors} />
          :
          (uniqueLocations.length > 0) &&
          <Splitter>
            <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{height: 600, overflow: 'scroll', paddingRight: 12}}>
              <VideosGridView
                processedRecords={videos}
                metadataFields={videoMetadataFields}
                processedRecordsPropName="videos"
                basicGridViewProps={{
                  videos,
                  videoMetadataFields,
                  isListView: true,
                }}
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
      {/* Outlet for VideoDetailView */}
      <Outlet />
    </>
  );
};

export default VideosDashboardPage;
