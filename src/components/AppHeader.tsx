import React from 'react';
import { Link } from "react-router-dom";
import { Avatar, Button, Dropdown, Layout, Menu } from 'antd';
const { Header } = Layout;

import { UserRecord } from '../types';

const headerMenuItems = [
  {
    key: 'media',
    label: <Link to={`videos`} style={{ textDecoration: 'none', color: 'inherit' }}>Media</Link>,
    children: [
      {
        key: 'videos',
        label: <Link to={`videos`}>Source videos</Link>,
      },
      {
        key: 'crops',
        label: <Link to={`crops`}>Crops</Link>,
      },
    ],
    popupOffset: [-14, 0],
  },
  {
    key: 'individuals',
    label: <Link to={`individuals`}>Individuals</Link>,
  },
  {
    key: 'project-settings',
    label: 'Project Settings',
  },
];

interface AppHeaderProps {
  currentMenuPage: string;
  user: UserRecord | null;
  logout: () => void;
}
const AppHeader: React.FC<AppHeaderProps> = ({currentMenuPage, user, logout}: AppHeaderProps) => {
  return (
    <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
      <Link to="/">
        <h3 style={{color: 'white'}}>AnimalMatch</h3>
      </Link>
      <Menu
        theme="dark"
        mode="horizontal"
        defaultSelectedKeys={['videos']}
        selectedKeys={[currentMenuPage]}
        items={headerMenuItems}
        style={{
          flex: "0 0 auto",
          minWidth: "307px" // 307px = width of 4 menu items
        }}
      />
      <Dropdown
        menu={{
          items: [
            // temporary hack to display username (TODO figure out a better implementation later)
            {
              key: 'username',
              label: user?.username,
              disabled: true,
            },
            {
              key: 'logout',
              label: 'Log out',
            }
          ],
          onClick: ({key}) => {
            if (key === 'logout') {
              logout();
            }
          }
        }}
      >
        <Button
          type="text"
          style={{color: 'white'}}
          icon={
            <Avatar style={{background: 'rgba(255, 255, 255, 0.25)'}}>
              {/* First letter of user's name */}
              {user?.name[0].toLocaleUpperCase()}
            </Avatar>
          }
          iconPosition="end"
        >
          {user?.name}
        </Button>
      </Dropdown>
      {/*
      TODO add to header:
      - help button
        - also show "About" info (e.g. created by VGG)
      */}
      {/* TODO add */}
    </Header>
  );
};

export default AppHeader;