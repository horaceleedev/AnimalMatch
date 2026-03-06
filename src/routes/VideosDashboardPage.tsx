import React, { useEffect, useMemo, useState } from 'react';
import { matchPath, Outlet, useLocation } from "react-router-dom";
import { Layout, Splitter, Tabs } from "antd";
import type { TabsProps } from 'antd';
import Icon, { AppstoreOutlined, NumberOutlined } from "@ant-design/icons";
import { RevoGrid } from '@revolist/react-datagrid';
import { RuleGroupType } from 'react-querybuilder';

import Table from '../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Map from '../assets/material_symbols/map_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { gridEditors, tableColumns, videoMetadataFields } from "../metadata.tsx";
import DashboardContent from '../components/dashboards/DashboardContent.tsx';
import VideosGridView from "../components/grid-views/VideosGridView.tsx";
import QueryOperationsButtons from "../components/dashboards/QueryOperationsButtons.tsx";
import { useAuth, useIndividualsStore, useVideoStore } from "../DataStores.tsx";
import BasicMapView from '../components/ui/BasicMapView.tsx';
import { useVideosDashboardSiderState, VideosDashboardSider } from '../components/dashboards/VideosDashboardSider.tsx';
import { MetadataFieldsType, Video } from '../types.ts';
import { filterByQuery } from '../lib/filtering/filterEngine.ts';
import "./VideosDashboardPage.scss";

/**
 * Store a copy of the filtered video list for use in outlet context.
 * @param videosFiltered 
 * @returns [outletVideos, setOutletVideos]
 */
function useOutletVideosState(videosFiltered: Video[]): [Video[], React.Dispatch<React.SetStateAction<Video[]>>] {
  /*
    Outlet video state stores the video list used to navigate between videos in VideoDetailView.
    Keep this separate from videosFiltered so that outlet context is not changed when the user
    edits the metadata of a video eg. by changing its annotation status or custom tags.
  */
  const [outletVideos, setOutletVideos] = useState<Video[]>(videosFiltered);

  // Update the outlet videos after navigating back to the dashboard page.
  const { pathname } = useLocation();
  useEffect(() => {
    if (matchPath("/videos", pathname)) {
      setOutletVideos(videosFiltered);
    }
  }, [pathname, videosFiltered]);

  return [outletVideos, setOutletVideos];
}

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
type VideoWithLinkedCount = Video & { linked_individual_count: number };
const linkedIndividualCountMetadataField: MetadataFieldsType[string] = {
  displayName: 'Linked individual count',
  icon: <NumberOutlined />,
  type: 'number',
  inputType: 'number',
  isInternal: true,
  isUneditable: true,
};

const VideosDashboardPage: React.FC = () => {
  const [view, setView] = useState(viewsTabsItems[0].key);
  const videos = useVideoStore((state) => state.processedRecords);
  const individuals = useIndividualsStore((state) => state.processedRecords);
  const uniqueLocations = useVideoStore((state) => state.extra.uniqueLocations);
  const uniqueValuesPerField = useVideoStore((state) => state.uniqueValuesPerField);

  const { user } = useAuth();

  const [sortFields, setSortFields] = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<("asc" | "desc")[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [groupOrders, setGroupOrders] = useState<("asc" | "desc")[]>([]);
  const [query, _setQuery] = useState(initialQuery);
  const setQuery = (newQuery: RuleGroupType) => {
    _setQuery(newQuery);
  };

  const linkedCountByVideoId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const individual of individuals) {
      const uniqueVideoIds = new Set(individual.videos);
      for (const videoId of uniqueVideoIds) {
        counts[videoId] = (counts[videoId] ?? 0) + 1;
      }
    }
    return counts;
  }, [individuals]);

  const videosWithLinkedIndividualCount: VideoWithLinkedCount[] = useMemo(
    () =>
      videos.map(video => ({
        ...video,
        linked_individual_count: linkedCountByVideoId[video.id] ?? 0,
      })),
    [videos, linkedCountByVideoId]
  );

  const videosDashboardMetadataFields = useMemo<MetadataFieldsType>(
    () => ({
      ...videoMetadataFields,
      linked_individual_count: linkedIndividualCountMetadataField,
    }),
    []
  );

  const [selectedSiderKey, setSelectedSiderKey, videosBySiderKey, videosFiltered] = useVideosDashboardSiderState(
    videosWithLinkedIndividualCount,
    videosDashboardMetadataFields,
    user
  );
  const videosFilteredByQuery = useMemo(
    () => filterByQuery(videosFiltered, query),
    [videosFiltered, query]
  );

  /*
    Keep a copy of filteredVideos, which only updates when navigating back to the dashboard
    or changing the sider selection.
  */
  const [outletVideos, setOutletVideos] = useOutletVideosState(videosFilteredByQuery);
  const outletContext = useMemo(() => ({
    videos: outletVideos,
  }), [outletVideos]);

  // Update outlet videos after selecting a group in VideosGridView.
  const onSelectGroup = (groupRecords: Video[]) => {
    setOutletVideos(groupRecords);
  };
  // Update outlet videos after selecting a sider key
  useEffect(() => {
    setOutletVideos(videosFilteredByQuery);
  }, [selectedSiderKey, videosFilteredByQuery]);

  const highlightLocationIds = useMemo(
    () => new Set(videosFilteredByQuery.map(video => JSON.stringify([video.lat, video.long]))),
    [videosFilteredByQuery]
  );

  return (
    <>
      <Layout
        className="no-background"
        style={{ /* background: colorBgContainer */ }}
      >
        <VideosDashboardSider
          selectedSiderKey={selectedSiderKey}
          onSelectSiderKey={(key: string) => setSelectedSiderKey(key)}
          videosBySiderKey={videosBySiderKey}
          videoMetadataFields={videosDashboardMetadataFields}
          uniqueValuesPerField={uniqueValuesPerField}
        />
        <DashboardContent>
          <QueryOperationsButtons
            metadataFields={videosDashboardMetadataFields} uniqueValuesPerField={uniqueValuesPerField}
            sortFields={sortFields} setSortFields={setSortFields} sortOrders={sortOrders} setSortOrders={setSortOrders}
            groupFields={groupFields} setGroupFields={setGroupFields} groupOrders={groupOrders} setGroupOrders={setGroupOrders}
            query={query} setQuery={setQuery}
          />

          <Tabs defaultActiveKey="grid" items={viewsTabsItems} onChange={setView} />

          {
            (view === 'grid') ? 
              <VideosGridView
                videos={videosFilteredByQuery}
                videoMetadataFields={videosDashboardMetadataFields}
                isListView={false}
                sortFields={sortFields}
                sortOrders={sortOrders}
                groupFields={groupFields}
                groupOrders={groupOrders}
                onSelectGroup={onSelectGroup}
              />
            :
            (
              (view === 'table') ?
              <>
                {
                  (sortFields.length > 0 || groupFields.length > 0) &&
                  "Note: the sorting/grouping options you have selected are not applied to this table view at the moment"
                }
                <RevoGrid columns={tableColumns} source={videosFilteredByQuery} rowHeaders={true} resize={true} autoSizeColumn={true} range={true} readonly={true} editors={gridEditors} />
              </>
              :
              (uniqueLocations.length > 0) &&
              <Splitter>
                <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{height: 600, overflow: 'scroll', paddingRight: 12}}>
                  <VideosGridView
                    videos={videosFilteredByQuery}
                    videoMetadataFields={videosDashboardMetadataFields}
                    isListView={true}
                    sortFields={sortFields}
                    sortOrders={sortOrders}
                    groupFields={groupFields}
                    groupOrders={groupOrders}
                    onSelectGroup={onSelectGroup}
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
