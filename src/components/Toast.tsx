type ToastProps = {
  message: string;
  kind?: "default" | "success" | "error";
};

export function Toast({ message, kind = "default" }: ToastProps) {
  return (
    <div className="toast" data-kind={kind}>
      {message}
    </div>
  );
}
