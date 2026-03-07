import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const TenantNotFound = ({ message }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
        <Store className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Empresa não encontrada</h1>
      <p className="text-muted-foreground mb-6">
        {message || "A empresa que você está procurando não existe ou foi desativada."}
      </p>
      <Link to="/">
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  </div>
);

export default TenantNotFound;
