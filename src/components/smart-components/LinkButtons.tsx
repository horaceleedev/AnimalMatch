import { Card, Flex, Typography } from "antd";
import { generatePath, Link } from "react-router-dom";
import { useIndividualsStoreWithCrops, useVideoStore } from "../../DataStores";
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
