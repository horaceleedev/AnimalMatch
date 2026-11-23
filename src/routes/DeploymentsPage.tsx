import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { App, Button, Empty, Layout, Menu } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ClientResponseError } from 'pocketbase';

import { useDeploymentsStore, useVideoStore } from '../DataStores.tsx';
import { deploymentsMetadataFields } from '../metadata.tsx';
import DashboardContent from '../components/dashboards/DashboardContent.tsx';
import RecordMetadataForm from '../components/detail-views/RecordMetadataForm.tsx';
import { DeploymentLabel } from '../components/smart-components/LinkButtons.tsx';
import "../components/dashboards/DashboardSider.scss";

// Lists deployments (camera placements) and edits the selected one
// ponytail: no delete yet; add one when deployments need removing (decide whether videos keep a dangling link)
const DeploymentsPage: React.FC = () => {
  const { message } = App.useApp();
  const [deployments, createDeployment, updateDeployment, uniqueValuesPerField] = useDeploymentsStore(
    useShallow((state) => [state.processedRecords, state.create, state.update, state.uniqueValuesPerField])
  );
  const videos = useVideoStore((state) => state.processedRecords);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = deployments.find(d => d.id === selectedId) ?? deployments[0];

  const videoCountByDeployment = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const video of videos) counts[video.deployment] = (counts[video.deployment] ?? 0) + 1;
    return counts;
  }, [videos]);

  const addDeployment = async () => {
    try {
      const created = await createDeployment({ locationName: 'New deployment' });
      setSelectedId(created.id);
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
          onClick={({ key }) => setSelectedId(key)}
          items={deployments.map(d => ({
            key: d.id,
            label: <DeploymentLabel id={d.id} />,
            extra: videoCountByDeployment[d.id] ?? 0,
          }))}
        />
      </Layout.Sider>
      <DashboardContent>
        {selected ? (
          <RecordMetadataForm
            key={selected.id}
            processedRecord={selected}
            metadataFields={deploymentsMetadataFields}
            uniqueValuesPerField={uniqueValuesPerField}
            updateFunction={updateDeployment}
          />
        ) : <Empty description="No deployments yet" />}
      </DashboardContent>
    </Layout>
  );
};

export default DeploymentsPage;
