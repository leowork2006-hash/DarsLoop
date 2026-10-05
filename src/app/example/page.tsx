import { ExampleLesson } from "@/components/example-lesson";
import { exampleLesson } from "@/lib/example";

export const dynamic = "force-static";
export default function Example() {
  return <ExampleLesson lesson={exampleLesson()} />;
}
