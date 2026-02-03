import { DeleteOutlined, EllipsisOutlined, LinkOutlined } from "@ant-design/icons";
import { App, Button, Dropdown, Tooltip } from "antd";
import { ClientResponseError } from "pocketbase";

interface RecordActionsButtonProps {
  recordType: string; // should be either "individual" or "crop"
  recordId: string;
  deleteFunction: (id: string) => Promise<void>;
  onDelete: () => void;
  style?: React.CSSProperties;
};

const RecordActionsButton: React.FC<RecordActionsButtonProps> = ({recordType, recordId, deleteFunction, onDelete, style}) => {
  const { message, modal } = App.useApp();

  const copyLinkToRecord = async () => {
    // relative path within this app (excluding the domain name and base path)
    const pathname = ["", recordType + "s", recordId].join('/');
    // determine the base URL e.g. `https://example.com/path/to/app/` from the base href
    // if available (e.g. `<base href="/path/to/app/">`), or default to the page's origin
    const base = document.getElementsByTagName("base")[0]?.href ?? window.location.origin;
    const fullUrl = base + pathname;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch (e) {
      console.error(e);
      message.error('Unable to copy link');
      return;
    }
    message.success('Link copied');
  };

  const deleteRecord = async () => {
    if (!["individual", "crop"].includes(recordType)) {
      alert('Unsupported record type');
      return;
    }

    // Prompt user for confirmation before deleting individual
    if (recordType === "individual") {
      const isConfirmed = await modal.confirm({
        title: "Are you sure you want to delete this individual?",
        content: "All crops of this individual will be deleted as well.",
        okButtonProps: {
          danger: true,
        },
        okText: "Delete",
      });
      if (!isConfirmed) return;
    }

    message.open({
      key: 'delete-record',
      type: 'loading',
      content: 'Deleting...',
      duration: 0,
    });
    try {
      await deleteFunction(recordId);
    } catch (e) {
      let errorMessage = `Unable to delete ${recordType}.`;
      if (e instanceof ClientResponseError) {
        errorMessage = e.message;
      }
      message.error({
        key: 'delete-record',
        content: errorMessage,
      });
      return;
    }
    message.open({
      key: 'delete-record',
      type: 'success',
      content: 'Deleted ' + recordType,
      duration: 2,
    });
    onDelete();
  };

  return (
    <Tooltip title="More options">
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            {
              label: 'Copy link',
              key: 'copy-link',
              icon: <LinkOutlined />,
            },
            {
              label: 'Delete ' + recordType,
              key: 'delete',
              icon: <DeleteOutlined />,
              danger: true,
              disabled: !["individual", "crop"].includes(recordType),
            },
          ],
          onClick: ({key}) => {
            if (key === 'copy-link') copyLinkToRecord()
            else if (key === 'delete') deleteRecord();
            else alert('Unknown option');
          }
        }}
      >
        <Button type="text" icon={<EllipsisOutlined />} style={style} />
      </Dropdown>
    </Tooltip>
  );
};

export default RecordActionsButton;