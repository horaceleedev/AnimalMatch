import { useState, useMemo } from "react";
import { Video, MetadataFieldsType, UserRecord } from "../../types";

export const useVideosDashboardSiderState = (
  videos: Video[],
  videoMetadataFields: MetadataFieldsType,
  user: UserRecord | null,
) => {
  const [selectedSiderKey, setSelectedSiderKey] = useState("all-videos");
  const videosBySiderKey: Record<string, Video[]> = useMemo(
    () => ({
      "all-videos": videos,
      "assigned-to-me": user
        ? videos.filter((video) => video.assignees.includes(user.id))
        : [],
      // annotation statuses
      ...videoMetadataFields["annotation_status"].presetOptions!.reduce(
        (acc: Record<string, Video[]>, status: string) => {
          acc[status] = videos.filter(
            (video) => video.annotation_status === status,
          );
          return acc;
        },
        {},
      ),
      // custom tags
      ...videos.reduce((acc: Record<string, Video[]>, cur: Video) => {
        for (const tag of cur.custom_tags) {
          const tagWithPrefix = "custom-tags/" + tag;
          if (!(tagWithPrefix in acc)) acc[tagWithPrefix] = [];
          acc[tagWithPrefix].push(cur);
        }
        return acc;
      }, {}),
    }),
    [videos, user, videoMetadataFields],
  );
  const videosFiltered = useMemo(
    () => videosBySiderKey[selectedSiderKey],
    [videosBySiderKey, selectedSiderKey],
  );
  /* Default to all videos if the selected sider key is deleted. */
  if (!videosFiltered) {
    setSelectedSiderKey("all-videos");
    return [
      "all-videos",
      setSelectedSiderKey,
      videosBySiderKey,
      videos,
    ] as const;
  }
  return [
    selectedSiderKey,
    setSelectedSiderKey,
    videosBySiderKey,
    videosFiltered,
  ] as const;
};
