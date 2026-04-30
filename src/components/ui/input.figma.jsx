import figma from "@figma/code-connect";
import { Input } from "@/components/ui/input";

figma.connect(
  Input,
  "https://www.figma.com/design/REPLACE_FILE_KEY/IMvision-DS?node-id=REPLACE_NODE_ID",
  {
    props: {
      placeholder: figma.string("Placeholder"),
      disabled: figma.boolean("Disabled"),
      type: figma.enum("Type", {
        Text: "text",
        Email: "email",
        Password: "password",
        Number: "number",
        Search: "search",
      }),
    },
    example: ({ placeholder, disabled, type }) => (
      <Input type={type} placeholder={placeholder} disabled={disabled} />
    ),
  },
);
