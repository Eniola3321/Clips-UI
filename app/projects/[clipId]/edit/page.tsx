import ClipEditor from "@/components/projects/ClipEditor";

interface EditPageProps {
  params: Promise<{ clipId: string }>;
}

export default async function EditClipPage({ params }: EditPageProps) {
  const { clipId } = await params;
  return <ClipEditor clipId={clipId} />;
}
