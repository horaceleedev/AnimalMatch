import React, { useEffect } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import { Layout, App as AntApp } from 'antd';
const { Content } = Layout;
import { useShallow } from 'zustand/react/shallow'

import { useCropsStore, useIndividualsStore, useDisconnectedMessage, useVideoStore, useAuth, useUsersStore } from "./DataStores.tsx";
import AppHeader from "./components/AppHeader.tsx";
import "./App.scss"

const App: React.FC = () => {
  const { message } = AntApp.useApp();

  const { user, logout } = useAuth();

  const [fetchUsers, subscribeToUsers, unsubscribeFromUsers] = useUsersStore(
    useShallow((state) => [state.fetch, state.subscribe, state.unsubscribe])
  );
  const [fetchVideos, subscribeToVideos, unsubscribeFromVideos] = useVideoStore(
    useShallow((state) => [state.fetch, state.subscribe, state.unsubscribe])
  );
  const [fetchIndividuals, subscribeToIndividuals, unsubscribeFromIndividuals] = useIndividualsStore(
    useShallow((state) => [state.fetch, state.subscribe, state.unsubscribe])
  );
  const [fetchCrops, subscribeToCrops, unsubscribeFromCrops] = useCropsStore(
    useShallow((state) => [state.fetch, state.subscribe, state.unsubscribe])
  );
  useDisconnectedMessage();

  // App initialization
  useEffect(() => {
    message.loading({
      key: 'fetching-data',
      content: 'Loading...',
      duration: 0,
    });
    Promise.all([fetchUsers(), fetchVideos(), fetchIndividuals(), fetchCrops()]).then(() => {
      message.destroy('fetching-data');
    }).catch((e) => {
      message.error({
        key: 'fetching-data',
        content: 'Unable to load data from the server. Try reloading the page.'
      });
      console.error(e);
    });
    subscribeToUsers();
    subscribeToVideos();
    subscribeToIndividuals();
    subscribeToCrops();
    return () => {
      unsubscribeFromUsers();
      unsubscribeFromVideos();
      unsubscribeFromIndividuals();
      unsubscribeFromCrops();
    };
  }, []);

  const routerLocation = useLocation();
  const currentMenuPage = routerLocation.pathname.split('/')[1]; // e.g. 'videos' or 'individuals'

  return (
    <Layout>
      <AppHeader currentMenuPage={currentMenuPage} user={user} logout={logout} />
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default App;