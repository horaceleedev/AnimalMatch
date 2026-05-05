import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { matchPath, Outlet, useLocation } from "react-router-dom";
import { Layout, Splitter, Tabs } from "antd";
import type { TabsProps } from 'antd';
import Icon, { AppstoreOutlined, NumberOutlined } from "@ant-design/icons";
import { RuleGroupType } from 'react-querybuilder';
import useSearchFilter from '../hooks/useSearchFilter.ts';

import Table from '../assets/material_symbols/table_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Map from '../assets/material_symbols/map_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { videoMetadataFields } from "../metadata.tsx";
import DashboardContent from '../components/dashboards/DashboardContent.tsx';
import VideosGridView from "../components/grid-views/VideosGridView.tsx";
import QueryOperationsButtons from "../components/dashboards/QueryOperationsButtons.tsx";
import { useAuth, useIndividualsStore, useVideoStore } from "../DataStores.tsx";
import BasicMapView from '../components/ui/BasicMapView.tsx';
import { useVideosDashboardSiderState, VideosDashboardSider } from '../components/dashboards/VideosDashboardSider.tsx';
import { filterByQuery } from '../lib/filtering/filterEngine.ts';
import VideosTableView from '../components/table-views/VideosTableView.tsx';
import { MetadataFieldsType, Video } from '../types.ts';
import "./VideosDashboardPage.scss";

/**
 * Cache a list of videos used for the previous/next navigation buttons in VideoDetailView.
 * This list is only updated when the input list of videos (videosFiltered) changes
 * while the user is on the dashboard page, such as when the sider selection is changed
 * or a text search is performed. It is also updated when the user clicks on a video within
 * a group in VideosGridView, in which case it is set to the list of videos in that group.
 * However, it is not updated when the user edits a video's metadata in VideoDetailView,
 * such as by changing its annotation status or custom tags, to ensure a consistent
 * navigation experience.
 *
 * @param videosFiltered - The current filtered list of videos from the dashboard (search + sider filters applied)
 * @returns An object with:
 *   - `outletContext`: Video list to pass to `<Outlet />` for prev/next navigation
 *   - `onSelectGroup`: Callback to update the outlet video list when a group is selected in VideosGridView
 */
function useNavigationVideosManager(videosFiltered: Video[]) {
  /*
    outletVideos state stores the video list used to navigate between videos in VideoDetailView.
    This is kept separate from videosFiltered to prevent the navigation list from changing
    when the user edits a video's metadata.
  */
  const [outletVideos, setOutletVideos] = useState<Video[]>(videosFiltered);

  // Keep outletVideos updated while the user is on the dashboard page.
  const { pathname } = useLocation();
  useEffect(() => {
    if (matchPath("/videos", pathname)) {
      setOutletVideos(videosFiltered);
    }
  }, [pathname, videosFiltered]);

  const outletContext = useMemo(() => ({
    videos: outletVideos,
  }), [outletVideos]);

  // Update outlet videos after selecting a group in VideosGridView.
  const onSelectGroup = useCallback((groupRecords: Video[]) => {
    setOutletVideos(groupRecords);
  }, []);

  return { outletContext, onSelectGroup };
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

  const [selectedSiderKey, setSelectedSiderKey, videosBySiderKey, siderFilteredVideos] = useVideosDashboardSiderState(
    videosWithLinkedIndividualCount,
    videosDashboardMetadataFields,
    user
  );
  const videosFilteredByQuery = useMemo(
    () => filterByQuery(siderFilteredVideos, query),
    [siderFilteredVideos, query]
  );
  const { filteredRecords: videosFiltered, setSearchQuery } = useSearchFilter(
    videosFilteredByQuery,
    videosDashboardMetadataFields
  );

  // Manage list of videos used for navigation in VideoDetailView
  const { outletContext, onSelectGroup } = useNavigationVideosManager(videosFiltered);

  const highlightLocationIds = useMemo(
    () => new Set(videosFiltered.map(video => JSON.stringify([video.lat, video.long]))),
    [videosFiltered]
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
            handleSearch={(val: string) => setSearchQuery(val)}
          />

          <Tabs defaultActiveKey="grid" items={viewsTabsItems} onChange={setView} />

          {
            (view === 'grid') ? 
              <VideosGridView
                videos={videosFiltered}
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
                <VideosTableView videos={videosFiltered} videoMetadataFields={videosDashboardMetadataFields} />
              </>
              :
              (uniqueLocations.length > 0) &&
              <Splitter>
                <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{height: 600, overflow: 'scroll', paddingRight: 12}}>
                  <VideosGridView
                    videos={videosFiltered}
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
