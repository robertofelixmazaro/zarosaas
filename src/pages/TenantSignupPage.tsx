import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors, ArrowLeft, Store, Mail, Lock, User, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const TenantSignupPage = () => {
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  const [step, setStep] = useState<"info" | "account">(user ? "info" : "account");
  const [loading, setLoading] = useState(false);

  // Account fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");

  // Tenant fields
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

  const handleCreateTenant = async () => {
    if (!shopName.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setLoading(true);

    try {
      let userId = user?.id;

      // If no user, create account first
      if (!userId) {
        // First create the tenant to get its ID
        const { data: tenantData, error: tenantErr } = await supabase
          .from("tenants" as any)
          .insert({ name: shopName, slug, phone, address } as any)
          .select("id")
          .single();

        if (tenantErr) {
          if (tenantErr.message?.includes("duplicate") || tenantErr.message?.includes("unique")) {
            toast.error("Este slug já está em uso. Escolha outro.");
          } else {
            toast.error("Erro ao criar barbearia: " + tenantErr.message);
          }
          setLoading(false);
          return;
        }

        const tenantId = (tenantData as any).id;

        // Sign up with tenant_id in metadata
        const { error: signupErr } = await signUp(email, password, {
          name: ownerName,
          tenant_id: tenantId,
        });

        if (signupErr) {
          // Cleanup tenant
          await supabase.from("tenants" as any).delete().eq("id", tenantId);
          toast.error("Erro ao criar conta: " + signupErr.message);
          setLoading(false);
          return;
        }

        // Sign in to get the user
        const { error: loginErr } = await signIn(email, password);
        if (loginErr) {
          toast.info("Conta criada! Verifique seu e-mail e faça login.");
          navigate(`/t/${slug}/login`);
          setLoading(false);
          return;
        }

        // Get user after sign in
        const { data: session } = await supabase.auth.getSession();
        userId = session?.session?.user?.id;

        if (userId) {
          // Update tenant owner and user role to admin
          await supabase.from("tenants" as any).update({ owner_user_id: userId } as any).eq("id", tenantId);
          await supabase.from("user_roles" as any).update({ role: "admin" } as any).eq("user_id", userId);
        }

        toast.success("Barbearia criada com sucesso!");
        navigate(`/t/${slug}/admin`);
      } else {
        // User already logged in - create tenant and assign
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("tenant_id")
          .eq("auth_id", userId)
          .maybeSingle();

        const { data: tenantData, error: tenantErr } = await supabase
          .from("tenants" as any)
          .insert({ name: shopName, slug, phone, address, owner_user_id: userId } as any)
          .select("id")
          .single();

        if (tenantErr) {
          if (tenantErr.message?.includes("duplicate") || tenantErr.message?.includes("unique")) {
            toast.error("Este slug já está em uso. Escolha outro.");
          } else {
            toast.error("Erro ao criar barbearia: " + tenantErr.message);
          }
          setLoading(false);
          return;
        }

        const tenantId = (tenantData as any).id;

        // Update profile and role with tenant
        await supabase.from("profiles" as any).update({ tenant_id: tenantId } as any).eq("auth_id", userId);
        await supabase.from("user_roles" as any).update({ role: "admin", tenant_id: tenantId } as any).eq("user_id", userId);

        toast.success("Barbearia criada com sucesso!");
        navigate(`/t/${slug}/admin`);
      }
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 justify-center mb-8">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
            <Store className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Criar Barbearia</span>
        </Link>

        <div className="rounded-lg border bg-card p-6 space-y-6">
          {step === "account" && !user && (
            <>
              <div>
                <h2 className="text-xl font-bold mb-1">Crie sua conta</h2>
                <p className="text-sm text-muted-foreground">Primeiro, crie sua conta de administrador</p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Seu nome" className="pl-10" required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" className="pl-10" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha (mín. 6 caracteres)" className="pl-10" required minLength={6} />
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep("info")} disabled={!ownerName || !email || !password || password.length < 6}>
                Continuar
              </Button>
            </>
          )}

          {(step === "info" || user) && (
            <>
              <div>
                <h2 className="text-xl font-bold mb-1">Dados da Barbearia</h2>
                <p className="text-sm text-muted-foreground">Configure sua barbearia</p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={shopName} onChange={(e) => handleShopNameChange(e.target.value)} placeholder="Nome da barbearia" className="pl-10" required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">URL: /t/{slug || "minha-barbearia"}</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug-da-barbearia" />
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
              <div className="flex gap-3">
                {!user && (
                  <Button variant="ghost" onClick={() => setStep("account")}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                )}
                <Button className="flex-1" onClick={handleCreateTenant} disabled={loading || !shopName.trim() || !slug.trim()}>
                  {loading ? "Criando..." : "Criar Barbearia"}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TenantSignupPage;
