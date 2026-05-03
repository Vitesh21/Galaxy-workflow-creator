import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

// Node dimensions (px at 100% zoom)
// RequestInputs: ~260w × 220h
// CropImage:     ~300w × 370h
// Gemini:        ~300w × 560h
// Response:      ~220w × 170h

// Layout: 5 clear columns, left-to-right DAG flow
// Col1 x=80:   Request-Inputs
// Col2 x=460:  Crop-1 (top), Crop-2 (bottom)
// Col3 x=900:  Gemini-1
// Col4 x=1340: Gemini-2
// Col5 x=1340: Gemini-3 (below Gemini-2, with gap)
// Col6 x=1800: Response

export const SAMPLE_NODES: WorkflowNode[] = [
  {
    id: "request-inputs",
    type: "requestInputs",
    position: { x: 80, y: 460 },
    data: {
      type: "request-inputs",
      label: "Request-Inputs",
      fields: [
        { id: "text_field",  label: "text_field",  kind: "text_field"  },
        { id: "image_field", label: "image_field", kind: "image_field" },
      ],
      fieldValues: {
        text_field: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
      },
      status: "idle",
    },
  },
  {
    id: "crop-1",
    type: "cropImage",
    position: { x: 460, y: 60 },
    data: {
      type: "crop-image",
      label: "Crop Image #1",
      x: 20, y: 20, w: 60, h: 60,
      status: "idle",
      manualInputs: {},
    },
  },
  {
    id: "crop-2",
    type: "cropImage",
    position: { x: 460, y: 500 },
    data: {
      type: "crop-image",
      label: "Crop Image #2",
      x: 0, y: 0, w: 100, h: 50,
      status: "idle",
      manualInputs: {},
    },
  },
  {
    id: "gemini-1",
    type: "gemini",
    position: { x: 900, y: 60 },
    data: {
      type: "gemini",
      label: "Gemini 3.1 Pro #1",
      systemPrompt: "You are a marketing copywriter. Write a one-paragraph product description.",
      model: "gemini-2.5-flash",
      status: "idle",
      manualInputs: {},
    },
  },
  {
    id: "gemini-2",
    type: "gemini",
    position: { x: 1360, y: 60 },
    data: {
      type: "gemini",
      label: "Gemini 3.1 Pro #2",
      systemPrompt: "Condense the following product description into a tweet-length hook (under 240 characters).",
      model: "gemini-2.5-flash",
      status: "idle",
      manualInputs: {},
    },
  },
  {
    id: "gemini-3",
    type: "gemini",
    position: { x: 1360, y: 700 },
    data: {
      type: "gemini",
      label: "Gemini 3.1 Pro #3 (Final)",
      systemPrompt: "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
      model: "gemini-2.5-flash",
      status: "idle",
      manualInputs: {},
    },
  },
  {
    id: "response",
    type: "responseNode",
    position: { x: 1820, y: 420 },
    data: { type: "response", label: "Response", status: "idle" },
  },
];

export const SAMPLE_EDGES: WorkflowEdge[] = [
  // image_field → both crop nodes
  {
    id: "e1",
    source: "request-inputs", sourceHandle: "image_field",
    target: "crop-1",         targetHandle: "input-image",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  {
    id: "e2",
    source: "request-inputs", sourceHandle: "image_field",
    target: "crop-2",         targetHandle: "input-image",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  // text_field → Gemini #1 prompt
  {
    id: "e3",
    source: "request-inputs", sourceHandle: "text_field",
    target: "gemini-1",       targetHandle: "prompt",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  // Gemini #1 response → Gemini #2 prompt
  {
    id: "e4",
    source: "gemini-1",  sourceHandle: "response",
    target: "gemini-2",  targetHandle: "prompt",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  // Crop #1 output → Gemini #3 image-vision-0
  {
    id: "e5",
    source: "crop-1",   sourceHandle: "output-image",
    target: "gemini-3", targetHandle: "image-vision-0",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  // Crop #2 output → Gemini #3 image-vision-1
  {
    id: "e6",
    source: "crop-2",   sourceHandle: "output-image",
    target: "gemini-3", targetHandle: "image-vision-1",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  // Gemini #2 response → Gemini #3 prompt
  {
    id: "e7",
    source: "gemini-2",  sourceHandle: "response",
    target: "gemini-3",  targetHandle: "prompt",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  // Gemini #3 response → Response result
  {
    id: "e8",
    source: "gemini-3", sourceHandle: "response",
    target: "response",  targetHandle: "result",
    animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
];
