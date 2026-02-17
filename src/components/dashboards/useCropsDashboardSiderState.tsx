import { useState, useMemo } from "react";
import { Crop, MetadataFieldsType, UserRecord } from "../../types";

export const useCropsDashboardSiderState = (
  crops: Crop[],
  cropsMetadataFields: MetadataFieldsType,
  user: UserRecord | null,
) => {
  const [selectedSiderKey, setSelectedSiderKey] = useState("all-crops");
  const cropsBySiderKey: Record<string, Crop[]> = useMemo(
    () => ({
      "all-crops": crops,
      "created-by-me": user
        ? crops.filter((crop) => crop.created_by === user.id)
        : [],
      // // body parts
      // ...cropsMetadataFields['body_part'].presetOptions!.reduce((acc: Record<string, Crop[]>, body_part: string) => {
      //   acc['body_part/'+body_part] = crops.filter(crop => crop.body_part === body_part);
      //   return acc;
      // }, {}),
      // custom tags
      ...crops.reduce((acc: Record<string, Crop[]>, cur: Crop) => {
        for (const tag of cur.custom_tags) {
          const tagWithPrefix = "custom-tags/" + tag;
          if (!(tagWithPrefix in acc)) acc[tagWithPrefix] = [];
          acc[tagWithPrefix].push(cur);
        }
        return acc;
      }, {}),
    }),
    [crops, user],
  );
  const cropsFiltered = useMemo(
    () => cropsBySiderKey[selectedSiderKey],
    [cropsBySiderKey, selectedSiderKey],
  );
  /* Default to all crops if the selected sider key is deleted. */
  if (!cropsFiltered) {
    setSelectedSiderKey("all-crops");
    return ["all-crops", setSelectedSiderKey, cropsBySiderKey, crops] as const;
  }
  return [
    selectedSiderKey,
    setSelectedSiderKey,
    cropsBySiderKey,
    cropsFiltered,
  ] as const;
};
