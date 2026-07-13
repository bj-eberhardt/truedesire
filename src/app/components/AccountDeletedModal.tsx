import { InfoModal } from "../../components/InfoModal";

type AccountDeletedModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AccountDeletedModal({ open, onClose }: AccountDeletedModalProps) {
  return (
    <InfoModal
      open={open}
      title="Account gel?scht"
      message="Der Account wurde gel?scht. Das l?sst sich nicht r?ckg?ngig machen."
      okLabel="OK"
      autoCloseMs={1800}
      onClose={onClose}
    />
  );
}
