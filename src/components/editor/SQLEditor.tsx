import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { type MutableRefObject } from "react";
import { useTabContext } from "../providers/TabContext";

export function SqlEditor({
  monacoRef,
}: {
  monacoRef: MutableRefObject<Monaco | null>;
}) {
  const { tab } = useTabContext();
  const { projecting } = tab;

  const showLineNumbers = projecting ? "off" : "on";
  const placeHolder = projecting
    ? `Filter points by PK query
e.g. SELECT id FROM table WHERE rating >= 3`
    : "";

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      tab.query.current = value;
    }
  };

  const handleEditorOnMount: OnMount = (editor, monaco) => {
    //removing editor param causes error
    monacoRef.current = monaco;
  };

  return (
    <Editor
      defaultLanguage="pgsql"
      theme="vs-light"
      defaultValue={tab.query.current}
      onChange={handleEditorChange}
      onMount={handleEditorOnMount}
      options={{
        placeholder: placeHolder,
        lineNumbers: showLineNumbers,
        tabSize: 2,
        fontSize: 13,
        lineDecorationsWidth: 0,
        minimap: { enabled: false },
        wordWrap: "on",
        padding: { top: 4 },
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showDeprecated: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          showIssues: true,
          showUsers: true,
          showSnippets: true,
        },
      }}
    />
  );
}
