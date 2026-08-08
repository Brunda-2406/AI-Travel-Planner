import React from "react";
import { Button } from "../ui/Button";

interface RetryButtonProps {
  onRetry: () => void;
  label?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({ onRetry, label = "Retry Operation" }) => {
  return (
    <Button variant="primary" size="sm" onClick={onRetry}>
      🔄 {label}
    </Button>
  );
};
