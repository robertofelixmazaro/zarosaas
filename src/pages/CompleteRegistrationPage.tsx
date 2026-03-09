import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, CreditCard, Lock, Eye, EyeOff, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatCpf, validateCpf, formatPhone } from "@/lib/cpfValidator";
import zaroLogo from "@/assets/zaro-logo.png";

type AccountType = "admin" | "affiliate";

const CompleteRegistrationPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUserRole, userRole, roleLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("admin");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // If not logged in, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user]);

  // Pre-fill name from user metadata
  useEffect(() => {
    if (user) {
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setName(metaName);
    }
  }, [user]);

  // If profile is already complete, redirect
  useEffect(() => {
    if (!authLoading && !roleLoading && user && userRole) {
      checkProfileComplete();
    }
  }, [authLoading, roleLoading, user, userRole]);

  const checkProfileComplete = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles" as any)
      .select("phone, cpf")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profile && (profile as any).phone) {
      // Profile already has phone → redirect based on role
      redirectByRole(userRole || "admin");
    }
  };

  const redirectByRole = (role: string) => {
    switch (role) {
      case "super_admin":
        navigate("/superadmin/dashboard", { replace: true });
        break;
      case "affiliate":
        navigate("/affiliate/dashboard", { replace: true });
        break;
      case "staff":
        navigate("/staff-dashboard/agenda", { replace: true });
        break;
      default:
        navigate("/dashboard", { replace: true });
        break;
    }
  };

  const handleCpfChange = (value: string) => {
    const formatted = formatCpf(value);
    setCpf(formatted);
    const stripped = value.replace(/\D/g, "");
    if (stripped.length === 11) {
      setCpfError(validateCpf(stripped) ? "" : "CPF inválido");
    } else {
      setCpfError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const strippedCpf = cpf.replace(/\D/g, "");
    if (strippedCpf.length > 0 && !validateCpf(strippedCpf)) {
      toast.error("CPF inválido");
      return;
    }
    if (!password) {
      setPasswordError("Por favor, defina uma senha para continuar.");
      toast.error("Por favor, defina uma senha para continuar.");
      return;
    }
    if (password.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres");
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setPasswordError("");

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles" as any)
        .update({
          name,
          phone: phone.replace(/\D/g, ""),
          whatsapp: phone.replace(/\D/g, ""),
          cpf: strippedCpf || null,
        } as any)
        .eq("auth_id", user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        toast.error("Erro ao atualizar perfil");
        setSaving(false);
        return;
      }

      // Update user role if needed
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const targetRole = accountType === "affiliate" ? "affiliate" : "admin";

      if (existingRole) {
        if (existingRole.role !== targetRole) {
          await supabase
            .from("user_roles")
            .update({ role: targetRole } as any)
            .eq("user_id", user.id);
        }
      } else {
        await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: targetRole } as any);
      }

      // Set password (required)
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) {
        console.error("Password update error:", pwError);
        toast.error("Erro ao definir senha");
        setSaving(false);
        return;
      }

      // If affiliate, create affiliates record
      if (targetRole === "affiliate") {
        const { data: existingAffiliate } = await supabase
          .from("affiliates")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existingAffiliate) {
          try {
            await supabase.functions.invoke("create-affiliate", {
              body: { user_id: user.id, name, email: user.email },
            });
          } catch (err) {
            console.error("Affiliate creation error:", err);
          }
        }
      }

      // Refresh role in context
      await refreshUserRole();

      toast.success("Cadastro completo!");
      redirectByRole(targetRole);
    } catch (err) {
      console.error("Complete registration error:", err);
      toast.error("Erro ao completar cadastro");
    }

    setSaving(false);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const isValid = name && phone.replace(/\D/g, "").length >= 10 && !cpfError;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 justify-center mb-6">
          <img src={zaroLogo} alt="Zaro Sistemas" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold tracking-tight">Zaro Sistemas</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-xl border bg-card p-8 shadow-lg space-y-5"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1">Complete seu cadastro</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados abaixo para ativar sua conta
            </p>
          </div>

          {/* Account type selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType("admin")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                accountType === "admin"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-muted hover:border-primary/40"
              }`}
            >
              <Store className={`h-7 w-7 ${accountType === "admin" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${accountType === "admin" ? "text-primary" : "text-foreground"}`}>
                Criar minha loja
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("affiliate")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                accountType === "affiliate"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-muted hover:border-primary/40"
              }`}
            >
              <Users className={`h-7 w-7 ${accountType === "affiliate" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${accountType === "affiliate" ? "text-primary" : "text-foreground"}`}>
                Ser afiliado
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="pl-10" required />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="Telefone / WhatsApp" className="pl-10" required />
            </div>
            <div>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={cpf} onChange={(e) => handleCpfChange(e.target.value)} placeholder="CPF (opcional)" className="pl-10" />
              </div>
              {cpfError && <p className="text-xs text-destructive mt-1">{cpfError}</p>}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Definir senha (opcional)"
                className="pl-10 pr-10"
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button type="submit" className="w-full h-11" disabled={saving || !isValid}>
              {saving ? "Salvando..." : "Completar cadastro"}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CompleteRegistrationPage;
