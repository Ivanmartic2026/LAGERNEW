import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RowActionsDropdown
 * A standardized dropdown for hiding secondary actions in list rows.
 *
 * Usage:
 * <RowActionsDropdown>
 *   <DropdownMenuItem onClick={...}>Action 1</DropdownMenuItem>
 *   <DropdownMenuItem onClick={...}>Action 2</DropdownMenuItem>
 *   <DropdownMenuSeparator />
 *   <DropdownMenuItem onClick={...} className="text-red-400">Delete</DropdownMenuItem>
 * </RowActionsDropdown>
 */

export function RowActionsDropdown({ children, className }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 border-white/20 bg-white/5 hover:bg-white/10 text-white",
            className
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Fler åtgärder</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 bg-slate-800 border-white/10 text-white"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DropdownMenuItem, DropdownMenuSeparator };
