import type { CSSProperties } from "react";
import type { PersonaItem } from "./PersonaListPane";
import type { PersonaForm } from "./PersonaEditorPane";
import { PersonaListPane } from "./PersonaListPane";
import { PersonaEditorPane } from "./PersonaEditorPane";
import { PersonaPreviewChat } from "./PersonaPreviewChat";

export function PersonaStudioShell(props: {
  personas: PersonaItem[];
  selected: PersonaItem | null;
  onSelect: (p: PersonaItem) => void;
  form: PersonaForm;
  loading: boolean;
  status: string;
  previewThread: string;
  previewMsg: string;
  previewResponse: string;
  onReload: () => void;
  onFormChange: (next: PersonaForm) => void;
  onCreate: () => void;
  onDeploy: (id: string) => void;
  onStartPreview: (id: string) => void;
  onPreviewMsgChange: (v: string) => void;
  onSendPreview: () => void;
}): JSX.Element {
  const root: CSSProperties = {
    display: "flex",
    height: "100vh",
    background: "#0f172a",
    color: "#e5e7eb",
    fontFamily: "sans-serif",
  };

  return (
    <div style={root}>
      <PersonaListPane
        personas={props.personas}
        selectedId={props.selected?.id ?? null}
        onSelect={props.onSelect}
        onReload={props.onReload}
        loading={props.loading}
      />
      <PersonaEditorPane
        form={props.form}
        loading={props.loading}
        status={props.status}
        onFormChange={props.onFormChange}
        onCreate={props.onCreate}
      />
      <PersonaPreviewChat
        selected={props.selected}
        loading={props.loading}
        previewThread={props.previewThread}
        previewMsg={props.previewMsg}
        previewResponse={props.previewResponse}
        onDeploy={props.onDeploy}
        onStartPreview={props.onStartPreview}
        onPreviewMsgChange={props.onPreviewMsgChange}
        onSendPreview={props.onSendPreview}
      />
    </div>
  );
}

