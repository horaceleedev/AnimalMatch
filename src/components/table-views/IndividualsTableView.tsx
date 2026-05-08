import { FC } from "react";
import { ColumnDataSchemaModel, RevoGrid, Template } from "@revolist/react-datagrid";
import { generatePath, useNavigate } from "react-router-dom";

import { UserLabel } from "../smart-components/LinkButtons";
import { MetadataFieldsType, Individual } from "../../types";

const IndividualLinkCell = (props: any) => {
  // Similar to VideoLinkCell in VideosTableView, this is a temporary implementation
  // to render a link to the individual's detail page.
  // It currently uses a simple anchor tag with React Router navigation in the onClick
  // handler, because rendering a React Router <Link> directly inside the RevoGrid cell
  // causes issues due to lack of React Router context.
  const path = generatePath(props.linkTemplate ?? "/individuals/:individualId", { individualId: props.value as string });
  return (
    <a
      href={"." + path} // use "./" prefix to make it relative to base href
      onClick={(e) => {
        // Use React Router navigation to avoid full page reload
        e.preventDefault();
        props.navigate(path);
      }}
    >
      Go to individual
    </a>
  );
};

interface IndividualsTableViewProps {
  individuals: Individual[];
  individualsMetadataFields: MetadataFieldsType;
  linkTemplate?: string;
}

const IndividualsTableView: FC<IndividualsTableViewProps> = ({ individuals, individualsMetadataFields, linkTemplate }) => {
  const navigate = useNavigate();
  const tableColumns = [
    {
      prop: 'id',
      name: 'Individual',
      autoSize: true,
      cellTemplate: Template(IndividualLinkCell, {
        navigate,
        linkTemplate,
      }),
    },
    ...Object.entries(individualsMetadataFields).map(([fieldName, metadataField]) => {
      let cellTemplate;
      if (metadataField.renderType === 'user_label') {
        cellTemplate = Template(
          ({ value }: Partial<ColumnDataSchemaModel>) => <UserLabel id={value as string} />
        );
      }
      if (metadataField.displayBooleanValuesAs) {
        cellTemplate = Template(
          ({ value }: Partial<ColumnDataSchemaModel>) => (
            <span>{value ? metadataField.displayBooleanValuesAs[1] : metadataField.displayBooleanValuesAs[0]}</span>
          )
        );
      }
      return {
        prop: fieldName,
        name: metadataField.displayName,
        autoSize: true,
        cellTemplate,
      };
    }),
  ];

  return <RevoGrid columns={tableColumns} source={individuals} rowHeaders={true} resize={true} autoSizeColumn={true} range={true} readonly={true} />
}

export default IndividualsTableView;