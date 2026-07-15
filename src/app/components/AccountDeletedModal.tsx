import { InfoModal } from "../../components/InfoModal";

type AccountDeletedModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AccountDeletedModal({ open, onClose }: AccountDeletedModalProps) {
  return (
    <InfoModal
      open={open}
      title="Account gelöscht"
      message="Der Account wurde gelöscht. Das lässt sich nicht rückgängig machen."
      okLabel="OK"
      autoCloseMs={1800}
      onClose={onClose}
    />
  );
}
