import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

const ThemeToggle = ({ variant = "ghost", size = "icon" }: { variant?: "ghost" | "outline"; size?: "icon" | "sm" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant={variant} size={size} onClick={toggleTheme} aria-label="Alternar tema">
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggle;
