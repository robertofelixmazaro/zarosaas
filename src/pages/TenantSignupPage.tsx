import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Store, Phone, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import zaroLogo from "@/assets/zaro-logo.png";

const TenantSignupPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUserRole } = useAuth();
  const [loading, setLoading] = useState(false);

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  };

  const handleShopNameChange = (val: string) => {
    setShopName(val);
    if (!slug || slug === generateSlug(shopName)) {
      setSlug(generateSlug(val));
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/cadastrar" replace />;
  }

  const handleCreateTenant = async () => {
    if (!shopName.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setLoading(true);

    try {
      const userId = user.id;

      const { data: tenantData, error: tenantErr } = await supabase
        .from("tenants")
        .insert({ name: shopName, slug, phone, address, owner_user_id: userId })
        .select("id")
        .single();

      if (tenantErr) {
        if (tenantErr.message?.includes("duplicate") || tenantErr.message?.includes("unique")) {
          toast.error("Este slug já está em uso. Escolha outro.");
        } else {
          toast.error("Erro ao criar negócio: " + tenantErr.message);
        }
        setLoading(false);
        return;
      }

      const tenantId = tenantData.id;

      // Auto-assign Free Trial plan
      const { data: trialPlan } = await supabase
        .from("plans")
        .select("id")
        .eq("name", "Teste Grátis")
        .eq("active", true)
        .maybeSingle();

      if (trialPlan) {
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 7);
        
        await supabase.from("subscriptions" as any).insert({
          tenant_id: tenantId,
          plan_id: trialPlan.id,
          status: "trial",
          trial_ends_at: trialEnds.toISOString(),
        });

        await supabase.from("tenants").update({ plan_id: trialPlan.id } as any).eq("id", tenantId);
      }

      await supabase.from("profiles").update({ tenant_id: tenantId } as any).eq("auth_id", userId);
      await supabase.from("user_roles").update({ role: "admin", tenant_id: tenantId } as any).eq("user_id", userId);

      // Refresh the role in AuthContext so ProtectedRoute allows access
      await refreshUserRole();

      toast.success("Negócio criado com sucesso! 🎉");
      navigate(`/t/${slug}/admin`);
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex flex-col items-center gap-3 justify-center mb-8">
          <img src={zaroLogo} alt="Zaro Logo" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold tracking-tight">Criar seu Negócio</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-xl border bg-card p-8 shadow-lg space-y-6"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Dados do Negócio</h2>
            </div>
            <p className="text-sm text-muted-foreground">Configure seu negócio na plataforma e comece a receber agendamentos</p>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={shopName} onChange={(e) => handleShopNameChange(e.target.value)} placeholder="Nome do negócio" className="pl-10" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL: /t/{slug || "meu-negocio"}</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug-do-negocio" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone (opcional)" className="pl-10" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço (opcional)" className="pl-10" />
            </div>
          </div>
          <Button className="w-full h-11" onClick={handleCreateTenant} disabled={loading || !shopName.trim() || !slug.trim()}>
            {loading ? "Criando..." : "Criar Negócio"}
          </Button>
        </motion.div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar ao início
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default TenantSignupPage;
