import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Store, Phone, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AdminSetupWizard = () => {
  const navigate = useNavigate();
  const { user, refreshUserRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

  const handleShopNameChange = (val: string) => {
    setShopName(val);
    if (!slug || slug === generateSlug(shopName)) {
      setSlug(generateSlug(val));
    }
  };

  const handleCreate = async () => {
    if (!shopName.trim() || !slug.trim() || !user) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { data: tenantData, error: tenantErr } = await supabase
        .from("tenants")
        .insert({ name: shopName, slug, phone, address, owner_user_id: user.id })
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
      await supabase.from("profiles").update({ tenant_id: tenantId } as any).eq("auth_id", user.id);
      await supabase.from("user_roles").update({ role: "admin", tenant_id: tenantId } as any).eq("user_id", user.id);
      await refreshUserRole();

      toast.success("Negócio criado com sucesso! 🎉");
      navigate(`/t/${slug}/admin`);
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="rounded-xl border bg-card p-8 shadow-lg space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Criar seu Negócio</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure seu negócio na plataforma e comece a receber agendamentos
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={shopName} onChange={(e) => handleShopNameChange(e.target.value)} placeholder="Nome do negócio" className="pl-10" />
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

          <Button className="w-full h-11" onClick={handleCreate} disabled={loading || !shopName.trim() || !slug.trim()}>
            {loading ? "Criando..." : "Criar Negócio e Continuar"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSetupWizard;
