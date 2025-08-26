import { App } from "antd";
import { isEqual, pick, pickBy } from "es-toolkit";
import { useEffect, useState } from "react";
import { RecordModel } from "pocketbase";

import { MetadataFieldsType } from "../types";

const useFormManager = <T extends RecordModel>(
  processedRecord: T,
  metadataFields: MetadataFieldsType,
  updateFunction: (id: string, data: Partial<T>) => Promise<void>,
) => {
  const { message } = App.useApp();

  // Changes made in the form component are saved here
  const [formData, setFormData] = useState<Partial<T>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  useEffect(() => {
    // Initialize formData from the IndividualsStore/VideoStore, or reset it to the
    // IndividualsStore/VideoStore if there is an update received from the server
    const _formData = pick(processedRecord, Object.keys(metadataFields)) as Partial<T>;
    if (hasUnsavedChanges && !isEqual(formData, _formData)) {
      message.warning('Your changes have been overwritten by new data from the server');
    }
    setHasUnsavedChanges(false);
    setFormData(_formData);
  }, [processedRecord]);

  const handleValuesChange = (_: any, allValues: any) => {
    // TODO in the future, implement a more efficient check
    // Currently a deep comparison between two objects is performed on each keystroke, which can be inefficient.
    // Instead of comparing the full objects, only compare the fields that have been touched in the form
    // e.g. using https://github.com/ant-design/ant-design/issues/26222#issuecomment-716275420
    setHasUnsavedChanges(
      !isEqual(allValues, pick(processedRecord, Object.keys(metadataFields)))
    );
    setFormData(allValues);
  };

  const saveChanges = async () => {
    // Pick just the keys and values from formData that were changed from the original data
    const updatedData = pickBy(formData, (value, key) => !isEqual(value, processedRecord[key]));
    setIsSavingChanges(true);
    try {
      await updateFunction(processedRecord.id, updatedData);
    } catch (e) {
      message.error('Your changes could not be saved. Please try again later.', 10);
      setIsSavingChanges(false);
      return;
    }
    message.success('Changes saved successfully');
    setIsSavingChanges(false);
  }

  return {
    formData,
    hasUnsavedChanges,
    isSavingChanges,
    handleValuesChange,
    saveChanges,
  };
}

export default useFormManager;