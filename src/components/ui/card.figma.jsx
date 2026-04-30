import figma from "@figma/code-connect";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

figma.connect(
  Card,
  "https://www.figma.com/design/REPLACE_FILE_KEY/IMvision-DS?node-id=REPLACE_NODE_ID",
  {
    props: {
      title: figma.string("Title"),
      description: figma.string("Description"),
      content: figma.children("Content"),
      footer: figma.children("Footer"),
    },
    example: ({ title, description, content, footer }) => (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
        <CardFooter>{footer}</CardFooter>
      </Card>
    ),
  },
);
