import type { Crop, Individual } from '../../types';

export const ANY_BODY_PART = "any body part";

export const getBodyPartOptions = (bodyPartOptions: string[]): string[] => {
  const uniqueBodyParts = Array.from(new Set(bodyPartOptions.filter(Boolean)));
  return [ANY_BODY_PART, ...uniqueBodyParts.filter(bodyPart => bodyPart !== ANY_BODY_PART)];
};

export const isBodyPartOptionDisabled = (
  bodyPart: string,
  availableBodyParts?: Set<string>,
): boolean => Boolean(availableBodyParts && bodyPart !== ANY_BODY_PART && !availableBodyParts.has(bodyPart));

export const filterCropsByBodyPart = (crops: Crop[], selectedBodyPart?: string): Crop[] => {
  if (!selectedBodyPart || selectedBodyPart === ANY_BODY_PART) return crops;
  return crops.filter(crop => crop.body_part === selectedBodyPart);
};

export const getAvailableBodyParts = (crops: Crop[]): Set<string> => (
  new Set(crops.map(crop => crop.body_part).filter(Boolean))
);

export const filterIndividualsByBodyPart = (
  individuals: Individual[],
  selectedBodyPart?: string,
): Individual[] => {
  if (!selectedBodyPart || selectedBodyPart === ANY_BODY_PART) return individuals;
  return individuals.filter(individual => individual.crops.some(crop => crop.body_part === selectedBodyPart));
};
