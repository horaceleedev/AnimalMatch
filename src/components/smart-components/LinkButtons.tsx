import { Card, Flex, Typography } from "antd";
import { Link } from "react-router-dom";
import { useIndividualsStore, useVideoStore } from "../../DataStores";


interface LinkButtonProps {
  id: string;
  linkBase?: string;
};

export const IndividualLinkButton: React.FC<LinkButtonProps> = ({ id, linkBase }: LinkButtonProps) => {
  if (!linkBase) linkBase = "/individuals/";
  if (!linkBase.endsWith("/")) linkBase = linkBase + "/";

  const individual = useIndividualsStore((state) => state.processedRecords.find(i => i.id === id));

  return (
    <Link key={id} to={linkBase + id}>
      <Card
        hoverable
        size="small"
        style={{ overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <Flex gap="small" align="center">
          <img src={individual?.imageUrls[0]} height={30} />
          <Typography.Title level={5} style={{margin: 0, fontSize: 12}}>{individual?.name}</Typography.Title>
        </Flex>
      </Card>
    </Link>
  );
};

export const VideoLinkButton: React.FC<LinkButtonProps> = ({ id, linkBase }: LinkButtonProps) => {
  if (!linkBase) linkBase = "/videos/";
  if (!linkBase.endsWith("/")) linkBase = linkBase + "/";

  const video = useVideoStore((state) => state.processedRecords.find(v => v.id === id));

  return (
    <Link key={id} to={linkBase + id}>
      <Card
        hoverable
        size="small"
        style={{ overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <Flex gap="small" align="center">
          {/* TODO replace <video> with thumbnail later */}
          <video src={video?.url} height={30} />
          <Typography.Title level={5} style={{margin: 0, fontSize: 12}}>{video?.filename}</Typography.Title>
        </Flex>
      </Card>
    </Link>
  );
};
