import { FC } from "react";
import { Video } from "../../types";
import { generatePath, useNavigate } from "react-router-dom";
import { Button, Flex } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

const PrevNextVideoButtons: FC<{
  video: Video,
  videoLinkTemplate?: string,
  videos?: Video[],
}> = ({
  video,
  videoLinkTemplate = "/videos/:videoId",
  videos = [],
}) => {
  const navigate = useNavigate();
  const videoIndex = videos.findIndex(v => v.id === video.id);
  let nextVideoId = '';
  let prevVideoId = '';
  if (videoIndex < videos.length - 1) {
    // If not the last video
    nextVideoId = videos[videoIndex + 1].id;
  }
  if (videoIndex > 0) {
    // If not the first video
    prevVideoId = videos[videoIndex - 1].id;
  }

  function navigateToVideo(videoId: string) {
    return () => navigate(generatePath(videoLinkTemplate, { videoId }));
  }

  return (
    <Flex gap="middle" justify="start">
      <Button
        aria-label="Previous video"
        shape="circle" icon={<LeftOutlined />}
        disabled={!prevVideoId}
        onClick={navigateToVideo(prevVideoId)}
      />
      <Button
        aria-label="Next video"
        shape="circle"
        icon={<RightOutlined />}
        disabled={!nextVideoId}
        onClick={navigateToVideo(nextVideoId)}
      />
    </Flex>
  );
};

export default PrevNextVideoButtons;