import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PlatformHeaderProps {
  children?: React.ReactNode;
}

const PlatformHeader = ({ children }: PlatformHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_logo_url")
      .single()
      .then(({ data }) => {
        if (data?.value) setLogoUrl(data.value);
      });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin-platform/login");
  };

  return (
    <header className="border-b bg-card px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-full object-cover shrink-0" />
        ) : (
          <Shield className="h-5 w-5 text-primary shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">ZARO — Painel da Plataforma</h1>
          <p className="text-sm text-muted-foreground">Visão geral do SaaS</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {children}
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground border-l pl-3">
          <span className="max-w-[180px] truncate">{user?.email}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default PlatformHeader;
