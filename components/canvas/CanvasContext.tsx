"use client";

import { createContext, useContext } from "react";

interface CanvasContextValue {
  runNode: (nodeId: string) => void;
  workflowId: string;
}

export const CanvasContext = createContext<CanvasContextValue>({
  runNode: () => {},
  workflowId: "",
});

export function useCanvas() {
  return useContext(CanvasContext);
}
