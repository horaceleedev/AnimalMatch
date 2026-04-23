import { FC } from "react";
import { ColumnDataSchemaModel, Editor, RevoGrid, Template, type Editors, type EditorType } from "@revolist/react-datagrid";
import { generatePath } from "react-router-dom";

import { UsersListLabel } from "../smart-components/LinkButtons";
import AnnotationStatusLabel from "../ui/AnnotationStatusLabel";
import { MetadataFieldsType, Video } from "../../types";

const VideoLinkCell = ({ value }: Partial<ColumnDataSchemaModel>) => {
  // TODO figure out how to render VideoLinkButton instead of a simple link
  // Currently VideoLinkButton does not work in the table view because of issues
  // with rendering a React Router <Link> inside a RevoGrid cell. The <Link>
  // component relies on React Router context, which is unavailable to the cell
  // component when rendered inside the RevoGrid.
  return <a href={generatePath("/videos/:videoId", { videoId: value as string })}>Go to video</a>;
};

const CustomEditor = ({ close } : EditorType) => {
  // temporary editor for testing
  return <button onClick={() => close()}>Close</button>
};
const CUSTOM_EDITOR_NAME = 'custom-editor';

interface VideosTableViewProps {
  videos: Video[];
  videoMetadataFields: MetadataFieldsType;
};

const VideosTableView: FC<VideosTableViewProps> = ({ videos, videoMetadataFields }) => {
  const tableColumns = [
    {
      prop: 'id',
      name: 'Video',
      autoSize: true,
      cellTemplate: Template(VideoLinkCell),
      editor: CUSTOM_EDITOR_NAME, // testing
    },
    ...Object.entries(videoMetadataFields).map(([fieldValue, value]) => {
      let cellTemplate;
      if (value.renderType === 'user_label') {
        // Rendering a list of users
        cellTemplate = Template(
          ({ value }: Partial<ColumnDataSchemaModel>) => <UsersListLabel ids={value as string[]} />
        );
      } else if (value.renderType === 'annotation_status_label') {
        cellTemplate = Template(
          ({ value }: Partial<ColumnDataSchemaModel>) => <AnnotationStatusLabel status={value as string} />
        );
      }
      return {
        prop: fieldValue,
        name: value.displayName,
        autoSize: true,
        cellTemplate: cellTemplate,
      };
    }),
    {
      prop: 'updated',
      name: 'Last updated',
      autoSize: true,
    },
  ];
  const gridEditors: Editors = { [CUSTOM_EDITOR_NAME]: Editor(CustomEditor) };

  return <RevoGrid columns={tableColumns} source={videos} rowHeaders={true} resize={true} autoSizeColumn={true} range={true} readonly={true} editors={gridEditors} />
}
export default VideosTableView;