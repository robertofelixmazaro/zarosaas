import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import zaroLogo from "@/assets/zaro-logo.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error("Reset password error:", error);
    }

    // Always show success to avoid email enumeration
    setSent(true);
    toast.success("Se o email existir, você receberá um link para redefinir sua senha.");
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
        <div className="flex flex-col items-center gap-3 justify-center mb-8">
          <img src={zaroLogo} alt="Zaro Sistemas" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold tracking-tight">Zaro Sistemas</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-xl border bg-card p-8 shadow-lg space-y-6"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1">Redefinir senha</h1>
            <p className="text-sm text-muted-foreground">
              {sent
                ? "Verifique sua caixa de entrada"
                : "Informe seu e-mail para receber o link de redefinição"}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Se o email existir, você receberá um link para redefinir sua senha.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="pl-10"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
            </form>
          )}

          {!sent && (
            <div className="text-center">
              <Button variant="ghost" className="text-sm text-muted-foreground" onClick={() => navigate("/login")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar para login
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
