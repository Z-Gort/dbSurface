//useAddDefinition adapted from Supabase codebase

import { type Monaco } from "@monaco-editor/react";
import { type IDisposable } from "monaco-editor";
import { useEffect, useRef } from "react";
import getPgsqlCompletionProvider from "~/lib/autocomplete/PgSQLCompletionProviders";
import getPgsqlSignatureHelpProvider from "~/lib/autocomplete/PgSQLSignatureHelpProvider";
import { trpc } from "~/lib/client";

export const useAddDefinitions = (monaco: Monaco | null) => {
  const { data: keywords, isSuccess: isKeywordsSuccess } =
    trpc.local.getKeywords.useQuery(undefined, {
      trpc: { context: { source: "local" } },
    });

  const { data: functions, isSuccess: isFunctionsSuccess } =
    trpc.local.getDbFunctions.useQuery(undefined, {
      trpc: { context: { source: "local" } },
    });

  const { data: schemas, isSuccess: isSchemasSuccess } =
    trpc.local.getSchemas.useQuery(undefined, {
      trpc: { context: { source: "local" } },
    });

  const { data: tableColumns, isSuccess: isTableColumnsSuccess } =
    trpc.local.getTables.useQuery(undefined, {
      trpc: { context: { source: "local" } },
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pgInfoRef = useRef<any>(null);

  const isPgInfoReady =
    isTableColumnsSuccess &&
    isSchemasSuccess &&
    isKeywordsSuccess &&
    isFunctionsSuccess;

  if (isPgInfoReady) {
    if (pgInfoRef.current === null) {
      pgInfoRef.current = {};
    }
    // eslint-disable-next-line
    pgInfoRef.current.tableColumns = tableColumns;
    // eslint-disable-next-line
    pgInfoRef.current.schemas = schemas;
    // eslint-disable-next-line
    pgInfoRef.current.keywords = keywords;
    // eslint-disable-next-line
    pgInfoRef.current.functions = functions;
  }

  // Register auto completion item provider for pgsql
  useEffect(() => {
    let completeProvider: IDisposable | null = null;
    let signatureHelpProvider: IDisposable | null = null;

    if (isPgInfoReady) {
      if (monaco) {
        completeProvider = monaco.languages.registerCompletionItemProvider(
          "pgsql",
          getPgsqlCompletionProvider(monaco, pgInfoRef),
        );
        signatureHelpProvider = monaco.languages.registerSignatureHelpProvider(
          "pgsql",
          getPgsqlSignatureHelpProvider(monaco, pgInfoRef),
        );
      }
    }
    return () => {
      completeProvider?.dispose();
      signatureHelpProvider?.dispose();
    };
  }, [isPgInfoReady, monaco]);
};
