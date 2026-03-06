import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ReferralRedirectPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem("zaro_ref_code", code);
    }
    navigate(`/cadastrar?ref=${code || ""}`, { replace: true });
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Redirecionando...
    </div>
  );
};

export default ReferralRedirectPage;
