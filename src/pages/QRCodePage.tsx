import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useTenant } from "@/contexts/TenantContext";

const QRCodePage = () => {
  const qrRef = useRef<HTMLDivElement>(null);
  const { tenant, tenantSlug } = useTenant();
  const basePath = getTenantBasePath(tenantSlug);
  const siteUrl = tenantSlug ? getTenantExternalUrl(tenantSlug) : window.location.origin;
  const shopName = tenant?.name || "Meu Negócio";
  const logoUrl = tenant?.logo_url || "";

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `${tenantSlug || "negocio"}-qrcode.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {logoUrl ? (
            <img src={logoUrl} alt={shopName} className="h-8 w-8 rounded-full object-cover" />
          ) : null}
          <span className="text-xl font-bold tracking-tight">{shopName}</span>
        </div>

        <h1 className="text-2xl font-bold">QR Code de Acesso</h1>
        <p className="text-muted-foreground text-sm">
          Escaneie o código abaixo para acessar o site e agendar seu horário
        </p>

        <div
          ref={qrRef}
          className="bg-white p-6 rounded-2xl inline-block mx-auto shadow-lg"
        >
          <QRCodeSVG
            value={siteUrl}
            size={256}
            level="H"
            includeMargin
            fgColor="#000000"
            bgColor="#ffffff"
            imageSettings={logoUrl ? {
              src: logoUrl,
              x: undefined,
              y: undefined,
              height: 56,
              width: 56,
              excavate: true,
            } : undefined}
          />
        </div>

        <p className="text-xs text-muted-foreground break-all">{siteUrl}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="outline" asChild>
            <Link to={basePath || "/"}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Baixar QR Code
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;
