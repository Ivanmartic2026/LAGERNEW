import figma from "@figma/code-connect";
import { Button } from "@/components/ui/button";

// Replace the URL below with the actual node URL of the Button component in your Figma file.
// figma.connect(<Component>, "<figma-node-url>", { ...mapping })
figma.connect(
  Button,
  "https://www.figma.com/design/REPLACE_FILE_KEY/IMvision-DS?node-id=REPLACE_NODE_ID",
  {
    props: {
      variant: figma.enum("Variant", {
        Primary: "default",
        Secondary: "secondary",
        Outline: "outline",
        Ghost: "ghost",
        Destructive: "destructive",
        Link: "link",
      }),
      size: figma.enum("Size", {
        Small: "sm",
        Default: "default",
        Large: "lg",
        Icon: "icon",
      }),
      disabled: figma.boolean("Disabled"),
      children: figma.string("Label"),
    },
    example: ({ variant, size, disabled, children }) => (
      <Button variant={variant} size={size} disabled={disabled}>
        {children}
      </Button>
    ),
  },
);
