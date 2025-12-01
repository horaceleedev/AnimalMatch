import React, { useMemo, useState } from 'react';
import { Outlet } from "react-router-dom";
import { Layout, Menu, Splitter, Tabs, theme, Typography } from "antd";
import type { TabsProps } from 'antd';
import Icon, { AppstoreOutlined, PlaySquareOutlined, TagOutlined, UserOutlined } from "@ant-design/icons";
import { RevoGrid } from '@revolist/react-datagrid';
import { RuleGroupType } from 'react-querybuilder';
const { Sider } = Layout;

import Table from '../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Map from '../assets/material_symbols/map_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { gridEditors, tableColumns, videoMetadataFields } from "../metadata.tsx";
import DashboardContent from '../components/DashboardContent.tsx';
import VideosGridView from "../components/VideosGridView.tsx";
import QueryOperationsButtons from "../components/QueryOperationsButtons.tsx";
import { useAuth, useVideoStore } from "../DataStores.tsx";
import BasicMapView from '../components/BasicMapView.tsx';
import AnnotationStatusLabel from '../components/AnnotationStatusLabel.tsx';
import { Video } from '../types.ts';
import "./VideosDashboardPage.scss";

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

  const { user } = useAuth();

  const [sortFields, setSortFields] = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<("asc" | "desc")[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [groupOrders, setGroupOrders] = useState<("asc" | "desc")[]>([]);
  const [query, _setQuery] = useState(initialQuery);
  const setQuery = () => {
    alert('Not implemented');
  }
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

  const highlightLocationIds = useMemo(
    () => new Set(videosFiltered.map(video => JSON.stringify([video.lat, video.long]))),
    [videosFiltered]
  );

  const { colorBgContainer } = theme.useToken().token;

  const outletContext = useMemo(() => ({
    videos: videosFiltered,
  }), [videosFiltered]);

  return (
    <>
      <Layout
        className="videos-dashboard-layout"
        style={{ /* background: colorBgContainer */ }}
      >
        <Sider className="videos-dashboard-sider" style={{ /* background: colorBgContainer */ }} width={220}>
          <h3>Videos</h3>
          <Menu
            mode="inline"
            selectedKeys={[selectedSiderKey]}
            className="videos-dashboard-sider-menu"
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
            onClick={({key}) => setSelectedSiderKey(key)}
          />
        </Sider>
        <DashboardContent style={{ padding: '28px 36px 36px' }} >
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
                processedRecords={videosFiltered}
                metadataFields={videoMetadataFields}
                processedRecordsPropName="videos"
                basicGridViewProps={{
                  videos: videosFiltered,
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
              <>
                {
                  (sortFields.length > 0 || groupFields.length > 0) &&
                  "Note: the sorting/grouping options you have selected are not applied to this table view at the moment"
                }
                <RevoGrid columns={tableColumns} source={videosFiltered} rowHeaders={true} resize={true} autoSizeColumn={true} range={true} readonly={true} editors={gridEditors} />
              </>
              :
              (uniqueLocations.length > 0) &&
              <Splitter>
                <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{height: 600, overflow: 'scroll', paddingRight: 12}}>
                  <VideosGridView
                    processedRecords={videosFiltered}
                    metadataFields={videoMetadataFields}
                    processedRecordsPropName="videos"
                    basicGridViewProps={{
                      videos: videosFiltered,
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
                  <BasicMapView style={{height: 600, width: 800}} uniqueLocations={uniqueLocations} highlightLocationIds={highlightLocationIds} />
                </Splitter.Panel>
              </Splitter>
            )
          }
        </DashboardContent>
      </Layout>
      {/* Outlet for VideoDetailView */}
      <Outlet context={outletContext} />
    </>
  );
};

export default VideosDashboardPage;
