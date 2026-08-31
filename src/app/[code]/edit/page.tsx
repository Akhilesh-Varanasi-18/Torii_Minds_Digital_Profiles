import { use } from "react";
import { Editor } from "@/components/editor/Editor";

export default function EditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return <Editor code={code} />;
}
