import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { App, Button, Empty, Layout, Menu, Splitter } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ClientResponseError } from 'pocketbase';

import { useDeploymentsStore, useVideoStore } from '../DataStores.tsx';
import { deploymentsMetadataFields } from '../metadata.tsx';
import DashboardContent from '../components/dashboards/DashboardContent.tsx';
import RecordMetadataForm from '../components/detail-views/RecordMetadataForm.tsx';
import BasicMapView from '../components/ui/BasicMapView.tsx';
import { DeploymentLabel } from '../components/smart-components/LinkButtons.tsx';
import { getLocationsFromDeployments } from '../utils/utils.ts';
import "../components/dashboards/DashboardSider.scss";

// Lists deployments (camera placements) and edits the selected one, next to a map for selecting by location
// ponytail: no delete yet; add one when deployments need removing (decide whether videos keep a dangling link)
const DeploymentsPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { deploymentId } = useParams();
  const [deployments, createDeployment, updateDeployment, uniqueValuesPerField] = useDeploymentsStore(
    useShallow((state) => [state.processedRecords, state.create, state.update, state.uniqueValuesPerField])
  );
  const videos = useVideoStore((state) => state.processedRecords);
  const selected = deployments.find(d => d.id === deploymentId) ?? deployments[0];
  const selectDeployment = (id: string) => navigate(`/deployments/${id}`);

  const videoCountByDeployment = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const video of videos) counts[video.deployment] = (counts[video.deployment] ?? 0) + 1;
    return counts;
  }, [videos]);
  const uniqueLocations = useMemo(() => getLocationsFromDeployments(deployments, videos), [deployments, videos]);
  const highlightLocationIds = useMemo(() => new Set(selected ? [selected.id] : []), [selected]);

  const addDeployment = async () => {
    try {
      const created = await createDeployment({ locationID: 'New deployment' });
      selectDeployment(created.id);
    } catch (e) {
      message.error(e instanceof ClientResponseError ? e.message : 'Unable to create deployment', 10);
    }
  };

  return (
    <Layout className="no-background">
      <Layout.Sider className="dashboard-sider" width={260}>
        <Button icon={<PlusOutlined />} onClick={addDeployment} style={{ margin: 12 }}>Add deployment</Button>
        <Menu
          className="dashboard-sider-menu"
          selectedKeys={selected ? [selected.id] : []}
          onClick={({ key }) => selectDeployment(key)}
          items={deployments.map(d => ({
            key: d.id,
            label: <DeploymentLabel id={d.id} />,
            extra: videoCountByDeployment[d.id] ?? 0,
          }))}
        />
      </Layout.Sider>
      <DashboardContent>
        <Splitter>
          <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{height: 600, overflow: 'scroll', paddingRight: 12}}>
            {selected ? (
              <RecordMetadataForm
                key={selected.id}
                processedRecord={selected}
                metadataFields={deploymentsMetadataFields}
                uniqueValuesPerField={uniqueValuesPerField}
                updateFunction={updateDeployment}
              />
            ) : <Empty description="No deployments yet" />}
          </Splitter.Panel>
          <Splitter.Panel style={{paddingLeft: 12}}>
            {uniqueLocations.length > 0 ? (
              <BasicMapView
                style={{height: 600, width: 800}}
                uniqueLocations={uniqueLocations}
                highlightLocationIds={highlightLocationIds}
                onLocationClick={selectDeployment}
              />
            ) : <Empty description="No deployments with coordinates yet" />}
          </Splitter.Panel>
        </Splitter>
      </DashboardContent>
    </Layout>
  );
};

export default DeploymentsPage;
