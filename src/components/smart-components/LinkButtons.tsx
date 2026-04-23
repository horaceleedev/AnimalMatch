import { Avatar, Card, Flex, Space, Tooltip, Typography } from "antd";
import { generatePath, Link } from "react-router-dom";
import { useIndividualsStoreWithCrops, useUsersStore, useVideoStore } from "../../DataStores";
import { RecordType } from "../../types";


interface LinkButtonProps {
  id: string;
  linkTemplate?: string;
  openModal?: (type: RecordType, id: string) => void;
};

export const IndividualLinkButton: React.FC<LinkButtonProps> = ({ id, linkTemplate = "/individuals/:individualId", openModal }: LinkButtonProps) => {
  // TODO see if there is an efficient implementation without loading all individuals
  const { individuals } = useIndividualsStoreWithCrops();
  const individual = individuals.find(i => i.id === id);

  return (
    <Link
      key={id}
      to={generatePath(linkTemplate, { individualId: id })}
      onClick={(e) => {
        if (!openModal) return;
        e.preventDefault();
        openModal("individual", id);
      }}
    >
      <Card
        hoverable
        size="small"
        style={{ overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <Flex gap="small" align="center">
          <img src={individual?.crops[0]?.imageUrl} height={26} style={{margin: 3, borderRadius: 5}} />
          <Typography.Title level={5} style={{margin: 0, fontSize: 12}}>{individual?.name}</Typography.Title>
        </Flex>
      </Card>
    </Link>
  );
};

export const VideoLinkButton: React.FC<LinkButtonProps> = ({ id, linkTemplate = "/videos/:videoId", openModal }: LinkButtonProps) => {
  const video = useVideoStore((state) => state.processedRecords.find(v => v.id === id));

  return (
    <Link
      key={id}
      to={generatePath(linkTemplate, { videoId: id })}
      onClick={(e) => {
        if (!openModal) return;
        e.preventDefault();
        openModal("video", id);
      }}
    >
      <Card
        hoverable
        size="small"
        style={{ overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <Flex gap="small" align="center">
          <img src={video?.thumbnailUrl} height={26} style={{margin: 3, borderRadius: 5}} />
          <Typography.Title level={5} style={{margin: 0, fontSize: 12}}>{video?.filename}</Typography.Title>
        </Flex>
      </Card>
    </Link>
  );
};

export const UserLabel: React.FC<{id: string}> = ({id}) => {
  const user = useUsersStore((state) => state.processedRecords.find(u => u.id === id));

  if (!user) return <></>;

  return (
    <Space styles={{item: {lineHeight: '18px'}}}>
      <Avatar size="small" style={{background: '#555'}}>
        {/* First letter of user's name */}
        {user.name[0].toLocaleUpperCase()}
      </Avatar>
      <Typography.Title level={5} style={{margin: 0, fontSize: 12}}>{user.name}</Typography.Title>
    </Space>
  );
};

export const UsersListLabel: React.FC<{ids: string[]}> = ({ids}) => {
  // Displays a list of users in a compact way
  const users = useUsersStore((state) => state.processedRecords).filter(u => ids.includes(u.id));
  
  if (users.length === 0) return <></>;
  return (
    <Avatar.Group size="small" max={{count: 4, style: {background: '#555'}}}>
      {users.map((user) => (
        <Tooltip key={user.id} title={user.name}>
          <Avatar size="small" style={{background: '#555'}}>
            {user.name[0].toLocaleUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
    </Avatar.Group>
  );
};