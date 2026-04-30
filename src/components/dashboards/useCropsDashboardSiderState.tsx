import { useState, useMemo } from "react";
import { Crop, MetadataFieldsType, UserRecord } from "../../types";

export const useCropsDashboardSiderState = (
  crops: Crop[],
  _cropsMetadataFields: MetadataFieldsType,
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
  // The selected key can disappear when its backing group/tag is removed, so
  // fallback to "all-crops" without mutating state during render.
  const effectiveSelectedSiderKey = cropsFiltered ? selectedSiderKey : "all-crops";
  return [
    effectiveSelectedSiderKey,
    setSelectedSiderKey,
    cropsBySiderKey,
    cropsFiltered ?? crops,
  ] as const;
};
